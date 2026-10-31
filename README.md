# THE HUMAN IDOL — Luxury Gothic Edition

React + Vite frontend for GitHub Pages, with Supabase Auth, PostgreSQL RLS and an Edge Function for secure score submission.

## Important security model

- Public visitors can read only published contestant/episode/result data.
- Judges authenticate with Supabase Auth and submit scores through `submit-score`.
- Judges have no database `SELECT` policy for `score_submissions`.
- Only users whose **server-managed** `app_metadata.role` is `admin` can read raw score submissions.
- Never put the Supabase `service_role` key in frontend code, GitHub Pages variables exposed to Vite, or a committed file.
- Do not assign admin by editing `user_metadata`. Use trusted Supabase server-side tooling / SQL.

## 1. Run locally

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Without Supabase configuration, the public pages render using sample content. Login and scoring require Supabase.

## 2. Configure Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication, create accounts for the owner and judges.
4. Assign roles using a trusted admin-only process. Example SQL for the project owner (replace the email):

```sql
-- Run only in the Supabase SQL Editor as project owner.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where email = 'owner@example.com';

-- For a judge account:
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'judge')
where email = 'judge@example.com';
```

After changing `app_metadata`, sign out and sign in again so the JWT contains the new role.

5. Add contestants and episodes in Supabase Table Editor. Set contestant `published = true`.
6. Create judge assignments in `judge_assignments` for each judge/episode/contestant.
7. Set an episode `status = 'OPEN'` to accept score submissions.

## 3. Deploy the Edge Function

Install the Supabase CLI, log in, link your project, then deploy:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy submit-score
```

The Edge Function uses the project's server-side `SUPABASE_SERVICE_ROLE_KEY` secret automatically. Never copy that secret into the browser app.

## 4. Deploy to GitHub Pages

For a project repository such as `username/the-human-idol`:

1. In `vite.config.js`, set `base: '/the-human-idol/'`.
2. In `package.json`, add `"homepage": "https://username.github.io/the-human-idol"` if desired.
3. Add GitHub repository Actions secrets/variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build and publish `dist` using GitHub Actions or `npm run build` + a Pages deployment workflow.

Example GitHub Actions workflow is included at `.github/workflows/deploy.yml`.

## 5. Before production

- Replace sample contestants and remote demo images with approved official assets.
- Add owner-only CRUD screens for contestant/episode/rubric management.
- Add an explicit published-results workflow (copy approved aggregate totals into `published_results`).
- Configure Supabase Auth redirect URLs for your GitHub Pages domain.
- Restrict CORS origins in the Edge Function to your production domain.
- Add rate limits, audit logs and backups.
- Test with three separate accounts: anonymous visitor, judge, owner. Confirm that anonymous/judge requests to `score_submissions` SELECT return no rows / permission denied, and owner can read all rows.
