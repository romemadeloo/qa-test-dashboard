import Link from 'next/link';
import { Play } from 'lucide-react';
import { Card, EmptyState, Notice, PageHeader } from '@/components/ui';
import { ExecutionsFeed } from '@/components/executions-feed';
import { ENVIRONMENT_KEYS } from '@/lib/constants';
import { EXECUTION_STATUSES as STATUSES, EXECUTION_TRIGGERS as TRIGGERS, fetchExecutionsPage } from '@/lib/executions';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ExecutionsPage({
  searchParams
}: {
  searchParams: Promise<{ env?: string; status?: string; trigger?: string; run?: string; error?: string }>
}) {
  const { env = '', status = '', trigger = '', error } = await searchParams;
  const filters = { env, status, trigger };
  const { project } = await getCurrentProject();
  const supabase = await createClient();
  const { executions, count } = await fetchExecutionsPage(supabase, project.id, filters, 0);
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
        <span className="text-xs text-muted">{count} runs</span>
      </form>

      <Card>
        {executions.length ? (
          <ExecutionsFeed key={`${env}|${status}|${trigger}`} initial={executions} total={count} filters={filters} />
        ) : (
          <EmptyState title="No executions match" />
        )}
      </Card>
    </>
  );
}
