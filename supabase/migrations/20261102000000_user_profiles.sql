-- Dashboard accounts: one profile per Supabase Auth user. Super admins create and manage accounts
-- from the Users page; those writes go through the service role after a super-admin check, so
-- signed-in users can only read profiles.
--
-- Accounts made on the Users page sign in with a username. Supabase Auth needs an email, so they
-- get <username>@users.qa-dashboard.internal (see USERNAME_EMAIL_DOMAIN), which never receives mail.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null check (role in ('QA', 'Frontend', 'Backend', 'Supervisor', 'General Manager', 'Manager')),
  is_superadmin boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);

-- Accounts that existed before user management (created in the Supabase dashboard) become the
-- first super admins, with a username taken from their email.
insert into public.profiles (id, username, full_name, role, is_superadmin)
select
  u.id,
  -- rpad also truncates, so pad only names shorter than the 3-character minimum.
  left(case when length(c.name) < 3 then rpad(c.name, 3, '0') else c.name end, 32),
  split_part(u.email, '@', 1),
  'QA',
  true
from auth.users u
cross join lateral (select regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._-]', '-', 'g') as name) c
where u.email is not null
on conflict do nothing;
