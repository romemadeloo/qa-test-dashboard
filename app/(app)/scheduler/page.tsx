import Link from 'next/link';
import { Suspense } from 'react';
import { CalendarPlus, Pencil } from 'lucide-react';
import { Card, EmptyState, Notice, PageHeader } from '@/components/ui';
import { ScheduleModal } from '@/components/schedule-form';
import { StatusBadge } from '@/components/status-badge';
import { nextRuns } from '@/lib/cron';
import { formatDateTime, formatRelative } from '@/lib/format';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';
import type { Execution, Schedule, Settings } from '@/lib/types';
import { deleteSchedule, runScheduleNow, toggleSchedule } from './actions';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const { project } = await getCurrentProject();
  const supabase = await createClient();

  const [schedulesRes, settingsRes] = await Promise.all([
    supabase.from('schedules').select('*').eq('project_id', project.id).order('name'),
    supabase.from('settings').select('*').eq('project_id', project.id).maybeSingle<Settings>()
  ]);
  const schedules = (schedulesRes.data ?? []) as Schedule[];
  const lastIds = schedules.map((s) => s.last_execution_id).filter(Boolean) as string[];
  const { data: lastRuns } = lastIds.length
    ? await supabase.from('executions').select('id,status,created_at').in('id', lastIds)
    : { data: [] };
  const lastById = new Map(((lastRuns ?? []) as Pick<Execution, 'id' | 'status' | 'created_at'>[]).map((e) => [e.id, e]));
  const configured = Boolean(settingsRes.data?.github_owner && settingsRes.data.github_repo);

  return (
    <>
      <PageHeader
        title="Scheduler"
        description="Recurring Playwright runs, dispatched to GitHub Actions when they are due."
        actions={
          <Link href="/scheduler?schedule=new" scroll={false} className="btn btn-primary">
            <CalendarPlus size={16} aria-hidden /> Create schedule
          </Link>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Schedule saved.</Notice>}
      {!configured && (
        <Notice>
          GitHub dispatch is not configured, so schedules cannot start runs yet. Set it up in <Link href="/settings" className="underline">Settings</Link>.
        </Notice>
      )}

      <div className="space-y-3">
        {schedules.length === 0 && (
          <Card>
            <EmptyState title="No schedules yet">
              <Link href="/scheduler?schedule=new" scroll={false} className="font-bold text-accent">
                Create your first schedule
              </Link>
            </EmptyState>
          </Card>
        )}
        {schedules.map((s) => {
          const upcoming = s.enabled ? nextRuns(s.cron, s.timezone, 3) : [];
          const last = s.last_execution_id ? lastById.get(s.last_execution_id) : undefined;
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold">{s.name}</h2>
                    {!s.enabled && <StatusBadge status="cancelled" />}
                  </div>
                  <div className="mt-1 text-sm text-ink-2">
                    <span className="tag">{s.cron}</span> {s.timezone} · {s.suite}
                    {s.custom_grep && <span className="ml-1 tag">{s.custom_grep}</span>} on <b>{s.environment_key}</b> · {s.browser_project}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {s.enabled
                      ? upcoming.length
                        ? `Next: ${upcoming.map((d) => formatDateTime(d)).join(' · ')}`
                        : 'Cron does not produce any upcoming run.'
                      : 'Disabled'}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    Last dispatched: {formatRelative(s.last_run_at)}
                    {last && (
                      <Link href={`/executions/${last.id}`}>
                        <StatusBadge status={last.status} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/scheduler?schedule=${s.id}`} scroll={false} className="btn">
                    <Pencil size={14} aria-hidden /> Edit
                  </Link>
                  <form action={runScheduleNow}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn" type="submit" disabled={!configured}>
                      Run now
                    </button>
                  </form>
                  <form action={toggleSchedule}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="enabled" value={String(!s.enabled)} />
                    <button className="btn" type="submit">
                      {s.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                  <form action={deleteSchedule}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn btn-danger" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Suspense fallback={null}>
        <ScheduleModal schedules={schedules} />
      </Suspense>
    </>
  );
}
