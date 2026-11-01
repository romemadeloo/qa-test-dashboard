import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2, Pencil, Plus, XCircle } from 'lucide-react';
import { EnvironmentModal } from '@/components/environment-modal';
import { Card, Notice, PageHeader } from '@/components/ui';
import { StatusBadge } from '@/components/status-badge';
import { formatPercent, formatRelative, passRate } from '@/lib/format';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';
import type { Environment, Execution } from '@/lib/types';
import { checkHealth } from './actions';

export const dynamic = 'force-dynamic';

export default async function EnvironmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { project } = await getCurrentProject();
  const supabase = await createClient();

  const [envRes, runsRes] = await Promise.all([
    supabase.from('environments').select('*').eq('project_id', project.id).order('is_production', { ascending: false }).order('key'),
    supabase
      .from('executions')
      .select('id,environment_key,status,created_at,passed,failed,flaky')
      .eq('project_id', project.id)
      .not('status', 'in', '(queued,running,cancelled)')
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)
  ]);
  const environments = (envRes.data ?? []) as Environment[];
  type RunRow = Pick<Execution, 'id' | 'environment_key' | 'status' | 'created_at' | 'passed' | 'failed' | 'flaky'>;
  const runsByEnv = new Map<string, RunRow[]>();
  for (const r of (runsRes.data ?? []) as RunRow[]) {
    if (!r.environment_key) continue;
    runsByEnv.set(r.environment_key, [...(runsByEnv.get(r.environment_key) ?? []), r]);
  }

  return (
    <>
      <PageHeader
        title="Environments"
        description="Targets from tests/fixtures/environments.ts. The workflow picks the server from the key; URLs here are for health checks and links."
        actions={
          <Link href="/environments?environment=new" scroll={false} className="btn btn-primary">
            <Plus size={16} aria-hidden /> Add environment
          </Link>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {environments.map((env) => {
          const runs = runsByEnv.get(env.key) ?? [];
          const agg = runs.reduce((a, r) => ({ p: a.p + r.passed, x: a.x + r.passed + r.failed + r.flaky }), { p: 0, x: 0 });
          const last = runs[0];
          const healthy = env.last_health_status != null && env.last_health_status >= 200 && env.last_health_status < 400;
          return (
            <Card key={env.id}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {env.name}
                      {env.is_production && <span className="ml-2 tag">production</span>}
                    </h2>
                    <div className="font-mono text-xs text-muted">{env.key}</div>
                  </div>
                  {last ? (
                    <Link href={`/executions/${last.id}`}>
                      <StatusBadge status={last.status} />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">no runs</span>
                  )}
                </div>
                {env.description && <p className="mt-2 text-sm text-ink-2">{env.description}</p>}

                <dl className="mt-3 space-y-1 text-xs">
                  {[
                    ['Storefront', env.base_url],
                    ['API', env.api_url],
                    ['Admin', env.admin_url]
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="w-16 shrink-0 text-muted">{label}</dt>
                      <dd className="min-w-0 truncate">
                        {value ? (
                          <a href={value} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {value.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-[var(--surface-2)] px-2 py-1.5">
                    <div className="text-muted">Pass rate (30d)</div>
                    <div className="text-sm font-semibold">{formatPercent(passRate(agg.p, agg.x))}</div>
                    <div className="text-muted">{runs.length} runs</div>
                  </div>
                  <div className="rounded bg-[var(--surface-2)] px-2 py-1.5">
                    <div className="text-muted">Health check</div>
                    {env.last_health_checked_at ? (
                      <div className={`flex items-center gap-1 text-sm font-semibold ${healthy ? 'text-good-text' : 'text-critical-text'}`}>
                        {healthy ? <CheckCircle2 size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
                        {env.last_health_status || 'no response'} · {env.last_health_latency_ms} ms
                      </div>
                    ) : (
                      <div className="text-sm text-muted">not checked</div>
                    )}
                    <div className="text-muted">{formatRelative(env.last_health_checked_at)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {env.base_url && (
                    <form action={checkHealth}>
                      <input type="hidden" name="id" value={env.id} />
                      <button className="btn text-xs" type="submit">
                        Check now
                      </button>
                    </form>
                  )}
                  <Link className="btn text-xs" href={`/executions?env=${env.key}`}>
                    Runs
                  </Link>
                  <Link className="btn text-xs" href={`/environments?run=1&runEnv=${env.key}`} scroll={false}>
                    Run tests
                  </Link>
                  <Link className="btn text-xs" href={`/environments?environment=${env.id}`} scroll={false}>
                    <Pencil size={13} aria-hidden /> Edit
                  </Link>
                </div>
                {env.is_production && (
                  <p className="mt-2 text-xs text-muted">The production WAF may answer 403 to Vercel&apos;s IPs; that is not an outage by itself.</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Suspense fallback={null}>
        <EnvironmentModal environments={environments} />
      </Suspense>
    </>
  );
}
