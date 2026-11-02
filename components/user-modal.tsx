'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Trash2, UserPlus, UserRoundPen } from 'lucide-react';
import { createUser, deleteUser, setUserActive, updateUser, type UserFormState } from '@/app/(app)/users/actions';
import { ROLES } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { FormError, Modal, useCloseModal } from './modal';

export type UserRow = Profile & { email: string | null; active: boolean; lastSignInAt: string | null; isSelf: boolean };

// Opens with ?user=new (create) or ?user=<id> (edit) on the Users page.
export function UserModal({ users }: { users: UserRow[] }) {
  const param = useSearchParams().get('user');
  const close = useCloseModal(['user']);
  if (!param) return null;
  const user = param === 'new' ? undefined : users.find((u) => u.id === param);
  if (param !== 'new' && !user) return null;

  return (
    <Modal
      title={user ? 'Edit user' : 'Create user'}
      subtitle={user ? `${user.full_name} · @${user.username}` : 'They sign in with the username and password you set here'}
      icon={user ? <UserRoundPen size={22} /> : <UserPlus size={22} />}
      onClose={close}
      width={640}
    >
      <UserForm key={param} user={user} onCancel={close} />
      {user && !user.isSelf && <AccountControls key={`controls-${param}`} user={user} />}
    </Modal>
  );
}

function UserForm({ user, onCancel }: { user?: UserRow; onCancel: () => void }) {
  const [state, action] = useActionState<UserFormState, FormData>(user ? updateUser : createUser, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} autoComplete="off">
      {user && <input type="hidden" name="id" value={user.id} />}
      <FormError message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="user-full-name">
            Full name
          </label>
          <input id="user-full-name" name="full_name" required defaultValue={user?.full_name} className="input w-full" placeholder="Juan Dela Cruz" />
        </div>
        <div>
          <label className="label" htmlFor="user-username">
            Username
          </label>
          <input
            id="user-username"
            name="username"
            required
            defaultValue={user?.username}
            pattern="[a-z0-9._\-]{3,32}"
            title="3–32 characters: lowercase letters, digits, dot, dash or underscore"
            autoCapitalize="none"
            spellCheck={false}
            className="input w-full font-mono"
            placeholder="jdelacruz"
          />
        </div>
        <div>
          <label className="label" htmlFor="user-role">
            Role
          </label>
          <select id="user-role" name="role" required defaultValue={user?.role ?? ''} className="input w-full">
            <option value="" disabled>
              Choose a role
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="user-password">
            {user ? 'New password' : 'Password'} {user && <span className="font-semibold text-[var(--muted)]">(leave blank to keep)</span>}
          </label>
          <div className="relative">
            <input
              id="user-password"
              name="password"
              type={show ? 'text' : 'password'}
              required={!user}
              minLength={8}
              autoComplete="new-password"
              className="input w-full !pr-11"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-[var(--muted)] hover:text-ink"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="user-confirm">
            Confirm password
          </label>
          <input id="user-confirm" name="confirm_password" type={show ? 'text' : 'password'} required={!user} minLength={8} autoComplete="new-password" className="input w-full" />
        </div>
        <label className="flex items-start gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" name="is_superadmin" defaultChecked={user?.is_superadmin} disabled={user?.isSelf} className="mt-0.5" />
          <span>
            Super admin <span className="font-normal text-[var(--muted)]">— can create and manage user accounts</span>
            {user?.isSelf && <input type="hidden" name="is_superadmin" value="on" />}
          </span>
        </label>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">At least 8 characters. Share it with the user directly; they can sign in right away.</p>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <Submit label={user ? 'Save changes' : 'Create user'} pendingLabel={user ? 'Saving…' : 'Creating…'} />
      </div>
    </form>
  );
}

function AccountControls({ user }: { user: UserRow }) {
  const [statusState, statusAction] = useActionState<UserFormState, FormData>(setUserActive, {});
  const [deleteState, deleteAction] = useActionState<UserFormState, FormData>(deleteUser, {});
  const [confirm, setConfirm] = useState('');

  return (
    <div className="mt-6 space-y-3">
      <form action={statusAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="active" value={String(!user.active)} />
        <div className="min-w-0">
          <div className="text-sm font-bold">{user.active ? 'Deactivate account' : 'Reactivate account'}</div>
          <p className="text-xs text-ink-2">{user.active ? 'Blocks sign-in and ends their sessions. Their data stays.' : 'Lets them sign in again with their password.'}</p>
          <FormError message={statusState.error} />
        </div>
        <Submit label={user.active ? 'Deactivate' : 'Reactivate'} pendingLabel="Saving…" variant={user.active ? 'danger' : 'default'} />
      </form>

      <form action={deleteAction} className="rounded-2xl bg-[var(--critical-soft)] p-4">
        <input type="hidden" name="id" value={user.id} />
        <div className="text-sm font-bold text-critical-text">Delete user</div>
        <p className="mt-1 text-xs text-ink-2">Removes the sign-in and profile. Type the username to confirm.</p>
        <FormError message={deleteState.error} />
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={user.username}
            aria-label={`Type ${user.username} to confirm`}
            className="input min-w-0 flex-1 font-mono"
          />
          <DeleteButton disabled={confirm.trim() !== user.username} />
        </div>
      </form>
    </div>
  );
}

function Submit({ label, pendingLabel, variant = 'primary' }: { label: string; pendingLabel: string; variant?: 'primary' | 'danger' | 'default' }) {
  const { pending } = useFormStatus();
  const cls = variant === 'primary' ? 'btn btn-primary' : variant === 'danger' ? 'btn btn-danger' : 'btn';
  return (
    <button className={cls} type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" type="submit" disabled={disabled || pending}>
      <Trash2 size={15} aria-hidden /> {pending ? 'Deleting…' : 'Delete user'}
    </button>
  );
}
