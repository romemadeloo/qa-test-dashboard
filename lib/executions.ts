import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ENVIRONMENT_KEYS } from './constants';
import type { Execution } from './types';

export const EXECUTION_STATUSES = ['queued', 'running', 'passed', 'failed', 'flaky', 'interrupted', 'timedout', 'cancelled'];
export const EXECUTION_TRIGGERS = ['ci', 'schedule', 'manual', 'local'];
// One batch: what the first screen shows, and what each scroll to the bottom adds.
export const EXECUTIONS_PAGE_SIZE = 10;

export type ExecutionFilters = { env: string; status: string; trigger: string };

// One page (0-based) of a project's executions, newest first. Unknown filter values are ignored, as
// the page's own filter form only offers known ones.
export async function fetchExecutionsPage(
  supabase: SupabaseClient,
  projectId: string,
  filters: ExecutionFilters,
  page: number
): Promise<{ executions: Execution[]; count: number }> {
  let query = supabase.from('executions').select('*', { count: 'exact' }).eq('project_id', projectId);
  if ((ENVIRONMENT_KEYS as readonly string[]).includes(filters.env)) query = query.eq('environment_key', filters.env);
  if (EXECUTION_STATUSES.includes(filters.status)) query = query.eq('status', filters.status);
  if (EXECUTION_TRIGGERS.includes(filters.trigger)) query = query.eq('trigger', filters.trigger);

  const from = Math.max(0, page) * EXECUTIONS_PAGE_SIZE;
  const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + EXECUTIONS_PAGE_SIZE - 1);
  return { executions: (data ?? []) as Execution[], count: count ?? 0 };
}
