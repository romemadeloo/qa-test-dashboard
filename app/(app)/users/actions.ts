'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ROLES, USERNAME_PATTERN, loginEmailFor } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertSuperadmin } from '@/lib/viewer';

export type UserFormState = { error?: string };

const MIN_PASSWORD = 8;
// Supabase has no permanent ban; a century is close enough.
const DEACTIVATED = '876000h';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function fail(error: unknown): UserFormState {
  return { error: error instanceof Error ? error.message : String(error) };
}

function checkPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `The password needs at least ${MIN_PASSWORD} characters.`;
  if (password !== confirm) return 'The passwords do not match.';
  return null;
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  let viewer;
  try {
    viewer = await assertSuperadmin();
  } catch (error) {
    return fail(error);
  }

  const fullName = text(formData, 'full_name');
  const username = text(formData, 'username').toLowerCase();
  const role = text(formData, 'role');
  const password = String(formData.get('password') ?? '');

  if (!fullName) return { error: 'Enter the full name.' };
  if (!USERNAME_PATTERN.test(username)) return { error: 'Usernames are 3–32 characters: lowercase letters, digits, dot, dash or underscore.' };
  if (!(ROLES as readonly string[]).includes(role)) return { error: 'Choose a role.' };
  const passwordError = checkPassword(password, String(formData.get('confirm_password') ?? ''));
  if (passwordError) return { error: passwordError };

  const admin = createAdminClient();
  const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) return { error: `The username "${username}" is already taken.` };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: loginEmailFor(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username }
  });
  if (error || !created.user) return { error: error?.message ?? 'Supabase did not create the account.' };

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    username,
    full_name: fullName,
    role,
    is_superadmin: formData.get('is_superadmin') === 'on',
    created_by: viewer.user.id
  });
  if (profileError) {
    // Keep auth and profiles in step: no account without a profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  revalidatePath('/users');
  redirect('/users?created=1');
}

export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  let viewer;
  try {
    viewer = await assertSuperadmin();
  } catch (error) {
    return fail(error);
  }

  const id = text(formData, 'id');
  const fullName = text(formData, 'full_name');
  const username = text(formData, 'username').toLowerCase();
  const role = text(formData, 'role');
  const isSuperadmin = formData.get('is_superadmin') === 'on';
  const password = String(formData.get('password') ?? '');

  if (!fullName) return { error: 'Enter the full name.' };
  if (!USERNAME_PATTERN.test(username)) return { error: 'Usernames are 3–32 characters: lowercase letters, digits, dot, dash or underscore.' };
  if (!(ROLES as readonly string[]).includes(role)) return { error: 'Choose a role.' };
  if (id === viewer.user.id && !isSuperadmin) return { error: 'You cannot remove your own super admin access.' };
  if (password) {
    const passwordError = checkPassword(password, String(formData.get('confirm_password') ?? ''));
    if (passwordError) return { error: passwordError };
  }

  const admin = createAdminClient();
  const { data: taken } = await admin.from('profiles').select('id').eq('username', username).neq('id', id).maybeSingle();
  if (taken) return { error: `The username "${username}" is already taken.` };

  const { error } = await admin
    .from('profiles')
    .update({ username, full_name: fullName, role, is_superadmin: isSuperadmin, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  if (password) {
    const { error: passwordError } = await admin.auth.admin.updateUserById(id, { password });
    if (passwordError) return { error: `Profile saved, but the password was not changed: ${passwordError.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/users?saved=1');
}

export async function setUserActive(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  let viewer;
  try {
    viewer = await assertSuperadmin();
  } catch (error) {
    return fail(error);
  }
  const id = text(formData, 'id');
  const active = formData.get('active') === 'true';
  if (id === viewer.user.id) return { error: 'You cannot deactivate your own account.' };

  const { error } = await createAdminClient().auth.admin.updateUserById(id, { ban_duration: active ? 'none' : DEACTIVATED });
  if (error) return { error: error.message };
  revalidatePath('/users');
  redirect(`/users?${active ? 'activated' : 'deactivated'}=1`);
}

// Deleting removes the sign-in and the profile. Runs and schedules the user made stay.
export async function deleteUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  let viewer;
  try {
    viewer = await assertSuperadmin();
  } catch (error) {
    return fail(error);
  }
  const id = text(formData, 'id');
  if (id === viewer.user.id) return { error: 'You cannot delete your own account.' };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('username').eq('id', id).maybeSingle();
  if (!profile) return { error: 'User not found.' };
  if (text(formData, 'confirm') !== profile.username) return { error: `Type ${profile.username} to confirm.` };

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath('/users');
  redirect('/users?deleted=1');
}
