# QA Test Automation and Monitoring

A Next.js app (on Vercel) with a Supabase backend for the Musticker Playwright suite
([romemadeloo/musticker-e2e](https://github.com/romemadeloo/musticker-e2e), the *test repo* below). The dashboard
and the tests live in separate repositories; they meet only through the reporter's HTTP calls and GitHub
`workflow_dispatch`.

| Section | What it shows |
| --- | --- |
| Dashboard | Last run, 7-day pass rate, active cases, flaky count, trends, recent runs, environment status, upcoming schedules |
| Analytics | Pass rate, outcomes and duration over 7/30/90 days per environment; flakiest, most-failing and slowest tests; weakest suites; per-browser stats |
| Projects | One project per Playwright repo (the reporter's `DASHBOARD_PROJECT` slug) |
| Test suites | One per spec file's top-level `describe` (a workbook Sub-Area), with area, tags, count and pass rate |
| Test cases | Every test by `MS-<MODULE>-###` ID: tags, last result, 30-day reliability, history, triage state (active / quarantined / retired) and notes |
| Executions | Every run, filterable; **Run tests** dispatches `manual-playwright.yml`; per-run results with errors and attachments |
| Reports | Week-over-week summary; a printable report per run (new failures vs. the previous run, by-suite table); CSV export |
| Scheduler | Cron schedules (Asia/Seoul by default) that dispatch GitHub Actions runs |
| Environments | production, qa, dev-1 … dev-6 with URLs, 30-day pass rate, last run and an on-demand health check |
| Settings | GitHub dispatch target, defaults, retention, Slack-on-failure, deployment secret status, reporter setup |

## Accounts

There is no public sign-up. **Super admins** create accounts on **System → Users** with a full name, username,
password and role (QA, Frontend, Backend, Supervisor, General Manager, Manager), and can edit, reset passwords,
deactivate or delete them. People sign in with their username (or an email, for accounts made in Supabase).

- Profiles live in `public.profiles`; Supabase Auth still holds the sign-in. Accounts created on the Users page get
  an internal email `<username>@users.qa-dashboard.internal` that never receives mail, so passwords are reset by a
  super admin, not by email.
- Roles are labels for now: every signed-in user can use the dashboard, but only super admins manage users and
  open **Settings** (migration `20261102100000_settings_superadmin.sql` limits changing settings to them in the database too).
- Accounts that existed before user management became super admins (migration `20261102000000_user_profiles.sql`).

## How data gets in

```
playwright test ──► tests/reporters/dashboard-reporter.ts (test repo) ──POST /api/ingest/runs──► Supabase
                     begin: test catalog + run metadata
                     results: final attempt per test, batches of 50
                     end: run status (last shard settles the run)

Dashboard "Run tests" / Scheduler cron ──► GitHub workflow_dispatch on the test repo (manual-playwright.yml, dashboard_run_id)
                                            └─► the reporter fills in that queued execution
```

The reporter is registered in the test repo's `playwright.config.ts` and does nothing until `DASHBOARD_URL` and
`DASHBOARD_INGEST_TOKEN` are set. Shards of one GitHub run (same `GITHUB_RUN_ID`) become one execution.
Flaky (passed on retry) counts as *not passed* in pass rates, matching `failOnFlakyTests` on CI.

## Setup

### 1. Supabase

1. Create a project at supabase.com.
2. In **SQL Editor**, run each file in `supabase/migrations/` in name order, then `supabase/seed.sql`
   (the seed adds the Musticker project, the eight environments and three disabled schedules).
   With the Supabase CLI instead: `npx supabase init`, `npx supabase link --project-ref <ref>`, `npx supabase db push`,
   then run the seed in the SQL editor.
   The `scheduler_pg_cron` migration makes Supabase call the scheduler every 15 minutes (pg_cron + pg_net). Once the
   Vercel deployment has its `CRON_SECRET`, store the same value in Vault so the job can authenticate:
   `select vault.create_secret('<CRON_SECRET>', 'dashboard_cron_secret');`. Until then the job does nothing.
3. **Authentication → Sign In / Providers → Email**: turn off "Allow new users to sign up". Accounts are created by a super
   admin on **System → Users**.
4. **Authentication → URL Configuration**: set the Site URL to the Vercel URL and add `<vercel-url>/auth/callback` as a
   redirect URL (for Supabase's emailed links, such as password resets).

### 2. Vercel

1. Import this GitHub repository (Root Directory stays the repository root). The framework is detected as Next.js.
2. Add the environment variables from `.env.example`:

   | Variable | Where it comes from |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only; never prefix with `NEXT_PUBLIC_` |
   | `DASHBOARD_INGEST_TOKEN` | Any long random string; the same value goes to GitHub and local `.env` |
   | `CRON_SECRET` | Any long random string; Vercel sends it to the cron route |
   | `GITHUB_TOKEN` | Fine-grained PAT for the **test repo** only, **Actions: Read and write** |
   | `SLACK_WEBHOOK_URL` | Optional incoming webhook |
   | `NEXT_PUBLIC_SITE_URL` | The deployment URL |

3. Deploy. `vercel.json` pins the Next.js framework and runs `/api/cron/scheduler` once a day (00:00 KST), the most the
   Hobby plan allows. The 15-minute scheduler resolution comes from Supabase pg_cron (see step 1); Vercel's daily cron
   is the backup. The route starts each occurrence once, however many callers reach it. (A GitHub Actions `*/15` tick
   was tried and removed on 2026-11-09: GitHub delayed it by 5 to 7 hours at a time.)

### 3. GitHub Actions

**The test repo**: add secrets `DASHBOARD_URL` and `DASHBOARD_INGEST_TOKEN`. Its `manual-playwright.yml` already passes
them, plus `dashboard_run_id` and `DASHBOARD_SUITE`. To have the other workflows report too, add the same two `env`
entries (and `DASHBOARD_SUITE: <name>`) to them.

In the dashboard, open **Settings** and fill in the test repo's GitHub owner, repository, workflow file and ref
(`production`).

### 4. Local runs

Add `DASHBOARD_URL`, `DASHBOARD_INGEST_TOKEN` and `DASHBOARD_PROJECT` to the test repo's `.env`; local runs then appear with
trigger `local`.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev
npm run typecheck
npm run build
```

## Notes

- The scheduler's environment, suite and browser options mirror the test repo's `manual-playwright.yml`
  `workflow_dispatch` inputs (`lib/constants.ts`). Change both together: add a value to the workflow first, since
  GitHub rejects one it does not list.
- The cron also marks runs stuck in queued/running for 6 hours as interrupted, and deletes executions older than each
  project's retention.
- Removed or renamed tests stay in the catalog with their history; retire them under Test cases.
- The test repo's `docs/test-cases.xlsx` remains the source of truth for case steps; the dashboard tracks execution.
