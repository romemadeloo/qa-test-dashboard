import { cookies } from 'next/headers';
import { AppShell, type Viewer } from '@/components/app-shell';
import { getViewer } from '@/lib/viewer';
import { FOLDED_COOKIE, NAV_COOKIE, PROJECT_COOKIE } from '@/lib/constants';
import { getProjects } from '@/lib/project';
import { createClient } from '@/lib/supabase/server';
import type { RunTarget } from '@/components/run-modal';
import type { Settings } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ user, profile }, projects] = await Promise.all([getViewer(), getProjects()]);
  const viewer: Viewer = {
    name: profile?.full_name ?? user?.email?.split('@')[0] ?? 'User',
    username: profile?.username ?? user?.email ?? '',
    role: profile?.role ?? null,
    isSuperadmin: profile?.is_superadmin ?? false
  };
  const jar = await cookies();
  const selected = jar.get(PROJECT_COOKIE)?.value;
  const initialCollapsed = jar.get(NAV_COOKIE)?.value === 'collapsed';
  const initialFolded = decodeURIComponent(jar.get(FOLDED_COOKIE)?.value ?? '')
    .split('|')
    .filter(Boolean);
  const currentId = projects.find((p) => p.id === selected)?.id ?? projects[0]?.id ?? '';

  const [{ count: recentFailures }, { data: settings }] = currentId
    ? await Promise.all([
        supabase
          .from('executions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentId)
          .in('status', ['failed', 'timedout', 'interrupted'])
          .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
        supabase.from('settings').select('*').eq('project_id', currentId).maybeSingle<Settings>()
      ])
    : [{ count: 0 }, { data: null }];

  // What the Run tests modal dispatches to.
  const runTarget: RunTarget = {
    repo: settings?.github_owner && settings.github_repo ? `${settings.github_owner}/${settings.github_repo}@${settings.github_ref}` : null,
    workflow: settings?.github_workflow ?? 'manual-playwright.yml',
    defaultEnvironment: settings?.default_environment ?? 'qa',
    defaultBrowser: settings?.default_browser ?? 'chromium-desktop'
  };

  return (
    <AppShell
      projects={projects}
      currentId={currentId}
      viewer={viewer}
      recentFailures={recentFailures ?? 0}
      initialCollapsed={initialCollapsed}
      initialFolded={initialFolded}
      runTarget={runTarget}
    >
      {children}
    </AppShell>
  );
}
