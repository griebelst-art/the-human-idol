import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthenticated" }, 401);

    const role = user.app_metadata?.role;
    if (role !== "judge" && role !== "admin") return json({ error: "Judge access required" }, 403);

    const { episode_id, scores } = await req.json();
    if (!episode_id || !Array.isArray(scores) || scores.length < 1 || scores.length > 500) {
      return json({ error: "Invalid score payload" }, 400);
    }

    const db = createClient(url, serviceKey);
    const { data: episode, error: epError } = await db.from("episodes")
      .select("id,status").eq("id", episode_id).single();
    if (epError || !episode || episode.status !== "OPEN") return json({ error: "Episode is not open for scoring" }, 400);

    const cleanRows = [];
    for (const item of scores) {
      const score = Number(item.score);
      if (!item.contestant_id || !item.rubric_id || !Number.isFinite(score) || score < 0) {
        return json({ error: "Invalid score value" }, 400);
      }
      const { data: rubric, error: rubricError } = await db.from("rubrics")
        .select("id,max_score").eq("id", item.rubric_id).single();
      if (rubricError || !rubric || score > Number(rubric.max_score)) {
        return json({ error: `Score exceeds maximum for rubric ${item.rubric_id}` }, 400);
      }

      if (role === "judge") {
        const { data: assignment } = await db.from("judge_assignments").select("id")
          .eq("judge_user_id", user.id).eq("episode_id", episode_id)
          .eq("contestant_id", item.contestant_id).maybeSingle();
        if (!assignment) return json({ error: "You are not assigned to this contestant" }, 403);
      }

      cleanRows.push({
        judge_user_id: user.id,
        episode_id,
        contestant_id: item.contestant_id,
        rubric_id: item.rubric_id,
        score,
        submitted_at: new Date().toISOString(),
      });
    }

    const { error: saveError } = await db.from("score_submissions").upsert(cleanRows, {
      onConflict: "judge_user_id,episode_id,contestant_id,rubric_id",
    });
    if (saveError) return json({ error: "Could not save scores" }, 500);
    return json({ ok: true, saved: cleanRows.length });
  } catch (_error) {
    return json({ error: "Unexpected server error" }, 500);
  }
});
