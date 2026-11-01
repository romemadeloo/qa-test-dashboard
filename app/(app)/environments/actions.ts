'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProject } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';

// An http(s) URL, null for blank, or false when it is not one.
function url(value: FormDataEntryValue | null): string | null | false {
  const v = String(value ?? '').trim();
  if (!v) return null;
  try {
    const parsed = new URL(v);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? v : false;
  } catch {
    return false;
  }
}

export type SaveEnvironmentState = { error?: string };

// Used with useActionState by the environment modal: problems come back as state and show in the
// modal; success closes it by navigating back to the list.
export async function saveEnvironment(_prev: SaveEnvironmentState, formData: FormData): Promise<SaveEnvironmentState> {
  const { project } = await getCurrentProject();
  const id = String(formData.get('id') ?? '');
  const key = String(formData.get('key') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!key || !name) return { error: 'Key and name are required.' };

  const urls = { base_url: url(formData.get('base_url')), api_url: url(formData.get('api_url')), admin_url: url(formData.get('admin_url')) };
  const invalid = Object.entries(urls).find(([, v]) => v === false);
  if (invalid) return { error: `Not a valid http(s) URL: ${String(formData.get(invalid[0]))}` };

  const row = {
    project_id: project.id,
    key,
    name,
    base_url: urls.base_url || null,
    api_url: urls.api_url || null,
    admin_url: urls.admin_url || null,
    is_production: formData.get('is_production') === 'on',
    description: String(formData.get('description') ?? '').trim() || null
  };

  const supabase = await createClient();
  const { error } = id ? await supabase.from('environments').update(row).eq('id', id) : await supabase.from('environments').insert(row);
  if (error) return { error: error.code === '23505' ? `An environment with key "${key}" already exists.` : error.message };
  revalidatePath('/environments');
  redirect('/environments');
}

export async function deleteEnvironment(formData: FormData) {
  const supabase = await createClient();
  await supabase.from('environments').delete().eq('id', String(formData.get('id') ?? ''));
  revalidatePath('/environments');
  redirect('/environments');
}

// A GET of the storefront from Vercel's network. The production WAF may answer 403 to
// datacenter IPs, which says nothing about whether customers can reach it — the card says so.
export async function checkHealth(formData: FormData) {
  const supabase = await createClient();
  const { data: env } = await supabase.from('environments').select('id,base_url').eq('id', String(formData.get('id') ?? '')).maybeSingle();
  if (!env?.base_url) return;

  const started = Date.now();
  let status = 0;
  try {
    const response = await fetch(env.base_url, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    status = response.status;
  } catch {
    status = 0;
  }

  await supabase
    .from('environments')
    .update({ last_health_status: status, last_health_latency_ms: Date.now() - started, last_health_checked_at: new Date().toISOString() })
    .eq('id', env.id);
  revalidatePath('/environments');
}
