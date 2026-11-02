-- Settings (GitHub dispatch target, defaults, retention, Slack) are for super admins only. Everyone
-- signed in still reads them, since Run tests and the scheduler need the dispatch target, and may
-- insert the default row a new project gets; changing or removing one needs a super admin.

drop policy "authenticated full access" on public.settings;

create policy "authenticated read settings" on public.settings for select to authenticated using (true);
create policy "authenticated insert settings" on public.settings for insert to authenticated with check (true);
create policy "super admins update settings" on public.settings for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_superadmin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_superadmin));
create policy "super admins delete settings" on public.settings for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_superadmin));
