-- STUDIA database setup for Supabase.
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'სასწავლო',
  filename text not null,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists materials_created_at_idx on public.materials(created_at desc);
create index if not exists summaries_user_created_idx on public.summaries(user_id, created_at desc);

-- Security-definer helper avoids recursive RLS checks when admins read profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Automatically create a profile after a user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.summaries enable row level security;

-- Users see their own profile; administrators can see all profiles.
drop policy if exists "profile read own or admin" on public.profiles;
create policy "profile read own or admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

-- Profile edits are intentionally not enabled in this starter.
-- This prevents users from changing their own role through the client.

-- All authenticated users can read material metadata. Only admins can manage it.
drop policy if exists "authenticated read materials" on public.materials;
create policy "authenticated read materials" on public.materials
for select to authenticated using (true);

drop policy if exists "admins insert materials" on public.materials;
create policy "admins insert materials" on public.materials
for insert to authenticated
with check (uploaded_by = (select auth.uid()) and public.is_admin());

drop policy if exists "admins update materials" on public.materials;
create policy "admins update materials" on public.materials
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete materials" on public.materials;
create policy "admins delete materials" on public.materials
for delete to authenticated
using (public.is_admin());

-- Users can create, read, and delete only their own personal notes.
drop policy if exists "read own summaries" on public.summaries;
create policy "read own summaries" on public.summaries
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users insert own summaries" on public.summaries;
create policy "users insert own summaries" on public.summaries
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "users delete own summaries" on public.summaries;
create policy "users delete own summaries" on public.summaries
for delete to authenticated using (user_id = (select auth.uid()));

-- Private file bucket: never make this bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520, array['application/pdf','text/plain','text/markdown','application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "authenticated read material files" on storage.objects;
create policy "authenticated read material files" on storage.objects
for select to authenticated using (
  bucket_id = 'materials' and (
    public.is_admin() or
    exists (select 1 from public.materials m where m.storage_path = name)
  )
);

drop policy if exists "admins upload material files" on storage.objects;
create policy "admins upload material files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'materials' and public.is_admin()
);

drop policy if exists "admins delete material files" on storage.objects;
create policy "admins delete material files" on storage.objects
for delete to authenticated using (
  bucket_id = 'materials' and public.is_admin()
);

-- After registering your own account, promote it to admin by running:
-- update public.profiles set role = 'admin' where email = 'YOUR-EMAIL@example.com';
