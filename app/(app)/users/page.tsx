import Link from 'next/link';
import { Suspense } from 'react';
import { Pencil, ShieldCheck, UserPlus } from 'lucide-react';
import { Card, EmptyState, Notice, PageHeader, TableWrap } from '@/components/ui';
import { UserModal, type UserRow } from '@/components/user-modal';
import { formatDateParts, formatRelative } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';
import { requireSuperadminPage } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  created: 'User created. Share the username and password with them.',
  saved: 'User saved.',
  deactivated: 'Account deactivated. They can no longer sign in.',
  activated: 'Account reactivated.',
  deleted: 'User deleted.'
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { user: viewer } = await requireSuperadminPage();

  // Super admins only (checked above): the service role reads sign-in status from Supabase Auth.
  const admin = createAdminClient();
  const [{ data: profiles }, { data: auth }] = await Promise.all([
    admin.from('profiles').select('*').order('full_name'),
    admin.auth.admin.listUsers({ perPage: 1000 })
  ]);
  const authById = new Map((auth?.users ?? []).map((u) => [u.id, u]));
  const users: UserRow[] = ((profiles ?? []) as Profile[]).map((p) => {
    const a = authById.get(p.id);
    const bannedUntil = (a as { banned_until?: string } | undefined)?.banned_until;
    return {
      ...p,
      email: a?.email ?? null,
      active: !bannedUntil || new Date(bannedUntil) < new Date(),
      lastSignInAt: a?.last_sign_in_at ?? null,
      isSelf: p.id === viewer.id
    };
  });
  const notice = Object.keys(NOTICES).find((k) => params[k]);

  return (
    <>
      <PageHeader
        title="Users"
        description="Dashboard accounts. Super admins create them here; there is no public sign-up."
        crumbs={[{ href: '/', label: 'Dashboard' }, { label: 'System' }, { label: 'Users' }]}
        actions={
          <Link href="/users?user=new" scroll={false} className="btn btn-primary">
            <UserPlus size={16} aria-hidden /> Create user
          </Link>
        }
      />
      {notice && <Notice tone="success">{NOTICES[notice]}</Notice>}

      <Card>
        {users.length ? (
          <TableWrap>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="num">Last sign-in</th>
                  <th className="num">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const created = formatDateParts(u.created_at);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Initials name={u.full_name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-ink">
                              {u.full_name}
                              {u.isSelf && <span className="text-xs font-semibold text-[var(--muted)]">(you)</span>}
                            </div>
                            {u.is_superadmin && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                                <ShieldCheck size={13} aria-hidden /> Super admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs">@{u.username}</td>
                      <td>
                        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-bold text-ink">{u.role}</span>
                      </td>
                      <td>
                        {u.active ? (
                          <span className="rounded-full bg-[var(--good-soft)] px-2.5 py-1 text-xs font-bold text-good-text">Active</span>
                        ) : (
                          <span className="rounded-full bg-[var(--critical-soft)] px-2.5 py-1 text-xs font-bold text-critical-text">Deactivated</span>
                        )}
                      </td>
                      <td className="num text-xs">{u.lastSignInAt ? formatRelative(u.lastSignInAt) : 'never'}</td>
                      <td className="num text-xs">{created?.date}</td>
                      <td className="text-right">
                        <Link href={`/users?user=${u.id}`} scroll={false} className="btn !px-3 !py-1.5 text-xs">
                          <Pencil size={13} aria-hidden /> Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No users yet" />
        )}
      </Card>

      <Suspense fallback={null}>
        <UserModal users={users} />
      </Suspense>
    </>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white"
      style={{ background: 'linear-gradient(135deg, #0ea5ff, #8965e5)' }}
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}
