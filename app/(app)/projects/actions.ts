'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PROJECT_COOKIE } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export type ProjectFormState = { error?: string };

function slugify(value: FormDataEntryValue | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
}

function optionalUrl(value: FormDataEntryValue | null): string | null | false {
  const v = String(value ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? v : false;
  } catch {
    return false;
  }
}

// Creates (no id) or updates a project. Used with useActionState by the project modal: problems
// come back as state; success closes the modal by navigating back to the list.
export async function saveProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const slug = slugify(formData.get('slug'));
  const repoUrl = optionalUrl(formData.get('repo_url'));
  if (!name || !slug) return { error: 'Name and slug are required.' };
  if (repoUrl === false) return { error: 'The repository URL must be an http(s) URL.' };

  const row = { name, slug, description: String(formData.get('description') ?? '').trim() || null, repo_url: repoUrl };
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from('projects').update(row).eq('id', id);
    if (error) return { error: error.code === '23505' ? `A project with slug "${slug}" already exists.` : error.message };
    revalidatePath('/', 'layout');
    redirect('/projects?saved=1');
  }

  const { data, error } = await supabase.from('projects').insert(row).select('id').single();
  if (error || !data) {
    return { error: error?.code === '23505' ? `A project with slug "${slug}" already exists.` : (error?.message ?? 'Could not create the project.') };
  }
  await supabase.from('settings').insert({ project_id: data.id });
  (await cookies()).set(PROJECT_COOKIE, data.id, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
  redirect('/projects?created=1');
}

// Deleting a project removes every run, case and schedule in it, so the slug must be typed back.
export async function deleteProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const id = String(formData.get('id') ?? '');
  const confirm = String(formData.get('confirm') ?? '').trim();
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('slug').eq('id', id).single();
  if (!project) return { error: 'Project not found.' };
  if (confirm !== project.slug) return { error: `Type ${project.slug} to confirm.` };

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/projects');
}
