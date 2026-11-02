import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

// The signed-in user and their dashboard profile, once per request.
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle<Profile>();
  return { user, profile };
});

// Pages: send non-super-admins to the dashboard.
export async function requireSuperadminPage() {
  const viewer = await getViewer();
  if (!viewer.profile?.is_superadmin) redirect('/');
  return viewer as { user: NonNullable<typeof viewer.user>; profile: Profile };
}

// Actions: refuse outright. Checked server-side before any service-role write.
export async function assertSuperadmin(what = 'manage users') {
  const viewer = await getViewer();
  if (!viewer.user || !viewer.profile?.is_superadmin) throw new Error(`Only a super admin can ${what}.`);
  return viewer as { user: NonNullable<typeof viewer.user>; profile: Profile };
}
