-- The scheduler tick, from inside Supabase. GitHub's */15 schedule (dashboard-scheduler.yml) was
-- running only every 5 to 7 hours, and Vercel Hobby crons run at most daily, so hourly schedules
-- were skipping most of their slots. pg_cron calls /api/cron/scheduler every 15 minutes through
-- pg_net; the other two callers stay as backups, since the route claims each occurrence once.
--
-- The bearer token is read from Supabase Vault at call time, so it never sits in this file or in
-- cron.job. Until a secret named 'dashboard_cron_secret' exists, the job does nothing. Store it once
-- in the SQL editor, using the Production CRON_SECRET from Vercel:
--
--   select vault.create_secret('<CRON_SECRET>', 'dashboard_cron_secret');
--
-- To rotate it: select vault.update_secret(id, '<new value>') from vault.secrets where name = 'dashboard_cron_secret';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Scheduling by name replaces an existing job of that name, so re-running this is safe.
select cron.schedule(
  'dashboard-scheduler-tick',
  '*/15 * * * *',
  $job$
    select net.http_get(
      url := 'https://qa-test-dashboard.vercel.app/api/cron/scheduler',
      headers := jsonb_build_object('Authorization', 'Bearer ' || decrypted_secret),
      timeout_milliseconds := 60000
    )
    from vault.decrypted_secrets
    where name = 'dashboard_cron_secret';
  $job$
);
