-- THE HUMAN IDOL secure schema
-- Run this in Supabase SQL Editor. Never put the service-role key in the frontend.

create extension if not exists pgcrypto;

create table if not exists public.contestants (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  name text not null,
  country text,
  team text,
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  status text not null default 'UPCOMING' check (status in ('UPCOMING','OPEN','CLOSED','PUBLISHED')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rubrics (
  id text primary key,
  label text not null,
  max_score numeric(6,2) not null check (max_score > 0),
  sort_order integer not null default 0
);

-- Each judge can score only the episode/contestants assigned to them.
create table if not exists public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  judge_user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  unique(judge_user_id, episode_id, contestant_id)
);

create table if not exists public.score_submissions (
  id uuid primary key default gen_random_uuid(),
  judge_user_id uuid not null references auth.users(id),
  episode_id uuid not null references public.episodes(id),
  contestant_id uuid not null references public.contestants(id),
  rubric_id text not null references public.rubrics(id),
  score numeric(6,2) not null check (score >= 0),
  submitted_at timestamptz not null default now(),
  unique(judge_user_id, episode_id, contestant_id, rubric_id)
);

-- Public results are separately published by the owner; raw submissions remain private.
create table if not exists public.published_results (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id),
  contestant_id uuid not null references public.contestants(id),
  public_total numeric(8,2) not null,
  rank integer,
  published_at timestamptz not null default now(),
  unique(episode_id, contestant_id)
);

alter table public.contestants enable row level security;
alter table public.episodes enable row level security;
alter table public.rubrics enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.score_submissions enable row level security;
alter table public.published_results enable row level security;

-- Public pages can see only published contestant, episode and result data.
create policy "public read published contestants" on public.contestants
for select using (published = true or (auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "public read episodes" on public.episodes
for select using (true);

create policy "public read rubric definitions" on public.rubrics
for select using (true);

create policy "public read published results" on public.published_results
for select using (true);

-- Owner-only raw score access. Judges and anonymous visitors have no SELECT policy.
create policy "admin reads all score submissions" on public.score_submissions
for select using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "admin manages contestants" on public.contestants
for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "admin manages episodes" on public.episodes
for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "admin manages rubrics" on public.rubrics
for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "admin manages assignments" on public.judge_assignments
for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "admin manages published results" on public.published_results
for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- Deliberately no client INSERT/UPDATE/DELETE policies on score_submissions.
-- Score writes must go through the Edge Function, which validates assignments,
-- judge role, episode status and rubric maximum using the service role key.

insert into public.rubrics(id,label,max_score,sort_order) values
('presentation','การนำเสนอผลงาน',20,1),
('concept','แนวคิดและการตีความ',10,2),
('execution','ความคิดสร้างสรรค์',10,3),
('impact','ภาพรวมและอิมแพกต์',10,4)
on conflict (id) do nothing;
