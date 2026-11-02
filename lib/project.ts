import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PROJECT_COOKIE } from './constants';
import { createClient } from './supabase/server';
import type { Project } from './types';

// Every page is scoped to one project, picked in the sidebar and remembered in a cookie.
export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').order('name');
  return (data ?? []) as Project[];
}

export async function getCurrentProject(): Promise<{ project: Project; projects: Project[] }> {
  const projects = await getProjects();
  if (projects.length === 0) {
    redirect('/projects?empty=1');
  }

  const selected = (await cookies()).get(PROJECT_COOKIE)?.value;
  const project = projects.find((p) => p.id === selected) ?? projects[0];
  return { project, projects };
}

// Tags the reporter has synced for this project's suites (describe-level, per docs/CONVENTIONS.md),
// offered as checkboxes for a custom-grep run.
export async function getAvailableTags(projectId: string): Promise<string[]> {
  if (!projectId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('test_suites').select('tags').eq('project_id', projectId);
  const tags = new Set(((data ?? []) as { tags: string[] }[]).flatMap((s) => s.tags));
  return [...tags].sort();
}
