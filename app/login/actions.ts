'use server';

import { redirect } from 'next/navigation';
import { loginEmailFor } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Only same-site paths, so the login form cannot be used as an open redirect.
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? '/');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

// A username resolves to its account's sign-in email, so accounts created with a real email in
// Supabase can also sign in by username. Unknown usernames fall through to the internal address and
// fail like a wrong password, without revealing which usernames exist.
async function emailFor(identifier: string): Promise<string> {
  const id = identifier.trim().toLowerCase();
  if (id.includes('@')) return id;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id').eq('username', id).maybeSingle();
  if (profile) {
    const { data } = await admin.auth.admin.getUserById(profile.id);
    if (data.user?.email) return data.user.email;
  }
  return loginEmailFor(id);
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: await emailFor(String(formData.get('identifier') ?? '')),
    password: String(formData.get('password') ?? '')
  });

  if (error) {
    // Deactivated accounts come back as "User is banned".
    const message = /banned/i.test(error.message) ? 'This account is deactivated. Ask a super admin to reactivate it.' : 'Wrong username, email or password.';
    redirect(`/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}
