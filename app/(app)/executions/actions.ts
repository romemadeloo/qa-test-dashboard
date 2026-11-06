'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BROWSER_PROJECTS, ENVIRONMENT_KEYS, SUITES, WORKER_OPTIONS } from '@/lib/constants';
import { dispatchRun } from '@/lib/github';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';

function pick<T extends readonly string[]>(allowed: T, value: FormDataEntryValue | null): T[number] {
  const v = String(value ?? '');
  if (!(allowed as readonly string[]).includes(v)) throw new Error(`Unsupported value "${v}".`);
  return v as T[number];
}

export type StartRunState = { error?: string };

// Used with useActionState by the Run tests modal: a refusal comes back as state and is shown in
// the modal; success navigates to the new execution.
export async function startRun(_prev: StartRunState, formData: FormData): Promise<StartRunState> {
  const { project } = await getCurrentProject();
  const supabase = await createClient();
  let executionId: string;

  try {
    executionId = await dispatchRun(supabase, {
      projectId: project.id,
      environment: pick(ENVIRONMENT_KEYS, formData.get('environment')),
      suite: pick(SUITES, formData.get('suite')),
      browserProject: pick(BROWSER_PROJECTS, formData.get('browser_project')),
      customGrep: String(formData.get('custom_grep') ?? '').trim() || null,
      workers: pick(WORKER_OPTIONS, formData.get('workers') ?? 'auto'),
      trigger: 'manual'
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  revalidatePath('/executions');
  redirect(`/executions/${executionId}?dispatched=1`);
}

// Only marks the dashboard row; a run already picked up by GitHub must be cancelled there.
export async function cancelExecution(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const supabase = await createClient();
  await supabase
    .from('executions')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['queued', 'running']);
  revalidatePath(`/executions/${id}`);
}

export async function deleteExecution(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const supabase = await createClient();
  await supabase.from('executions').delete().eq('id', id);
  revalidatePath('/executions');
  redirect('/executions');
}
