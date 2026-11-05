import Link from 'next/link';
import { Play } from 'lucide-react';
import { Card, EmptyState, Notice, PageHeader } from '@/components/ui';
import { ExecutionsTable } from '@/components/executions-table';
import { ENVIRONMENT_KEYS } from '@/lib/constants';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';
import type { Execution } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES = ['queued', 'running', 'passed', 'failed', 'flaky', 'interrupted', 'timedout', 'cancelled'];
const TRIGGERS = ['ci', 'schedule', 'manual', 'local'];
const PAGE_SIZE = 8;

export default async function ExecutionsPage({
  searchParams
}: {
  searchParams: Promise<{ env?: string; status?: string; trigger?: string; run?: string; error?: string; page?: string }>
}) {
  const { env = '', status = '', trigger = '', error, page = '1' } = await searchParams;
  const pageNo = Math.max(1, Number(page) || 1);
  const { project } = await getCurrentProject();
  const supabase = await createClient();

  let query = supabase.from('executions').select('*', { count: 'exact' }).eq('project_id', project.id);
  if ((ENVIRONMENT_KEYS as readonly string[]).includes(env)) query = query.eq('environment_key', env);
  if (STATUSES.includes(status)) query = query.eq('status', status);
  if (TRIGGERS.includes(trigger)) query = query.eq('trigger', trigger);

  const { data, count } = await query.order('created_at', { ascending: false }).range((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE - 1);
  const executions = (data ?? []) as Execution[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (n: number) => `/executions?${new URLSearchParams({ env, status, trigger, page: String(n) })}`;
  // Opens the Run tests modal (app-shell) without losing the current filters.
  const runHref = `/executions?${new URLSearchParams({ ...Object.fromEntries(Object.entries({ env, status, trigger }).filter(([, v]) => v)), run: '1' })}`;

  return (
    <>
      <PageHeader
        title="Executions"
        description="Every Playwright run reported by CI, the scheduler, or a local run with the dashboard reporter."
        actions={
          <Link href={runHref} scroll={false} className="btn btn-primary">
            <Play size={15} aria-hidden /> Run tests
          </Link>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <form className="no-print mb-4 flex flex-wrap items-end gap-3">
        <select name="env" defaultValue={env} className="input" aria-label="Environment">
          <option value="">All environments</option>
          {ENVIRONMENT_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="input" aria-label="Status">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="trigger" defaultValue={trigger} className="input" aria-label="Trigger">
          <option value="">Any trigger</option>
          {TRIGGERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Filter
        </button>
        <span className="text-xs text-muted">{count ?? 0} runs</span>
        {pages > 1 && (
          <nav aria-label="Pagination" className="ml-auto flex items-center gap-2 text-sm">
            {pageNo > 1 && (
              <Link className="btn" href={href(pageNo - 1)}>
                Previous
              </Link>
            )}
            <span className="text-muted">
              Page {pageNo} of {pages}
            </span>
            {pageNo < pages && (
              <Link className="btn" href={href(pageNo + 1)}>
                Next
              </Link>
            )}
          </nav>
        )}
      </form>

      <Card>
        {executions.length ? <ExecutionsTable executions={executions} /> : <EmptyState title="No executions match" />}
      </Card>
    </>
  );
}
