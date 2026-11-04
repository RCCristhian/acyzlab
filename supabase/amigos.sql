-- Acyz Lab: amigos y ranking de poder.
-- Pégalo en Supabase → SQL Editor → New query → Run (después de schema.sql).

-- Ficha pública de cada persona (solo la ven ella misma y sus amigos)
create table if not exists public.acyzlab_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  stats        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Solicitudes y amistades
create table if not exists public.acyzlab_friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null references auth.users (id) on delete cascade,
  addressee  uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists acyzlab_friendships_pair
  on public.acyzlab_friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.acyzlab_profiles enable row level security;
alter table public.acyzlab_friendships enable row level security;

-- ¿Hay una solicitud o amistad entre a y b?
create or replace function public.acyzlab_are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from acyzlab_friendships f
    where (f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)
  );
$$;

-- Buscar a alguien por su correo exacto (solo devuelve id y nombre)
create or replace function public.acyzlab_find_user(p_email text)
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.display_name from acyzlab_profiles p
  where lower(p.email) = lower(trim(p_email)) and p.user_id <> auth.uid()
  limit 1;
$$;
revoke all on function public.acyzlab_find_user(text) from public, anon;
grant execute on function public.acyzlab_find_user(text) to authenticated;
revoke all on function public.acyzlab_are_connected(uuid, uuid) from public, anon;
grant execute on function public.acyzlab_are_connected(uuid, uuid) to authenticated;

-- Reglas de la ficha
drop policy if exists "ver mi ficha y la de mis amigos" on public.acyzlab_profiles;
drop policy if exists "crear mi ficha" on public.acyzlab_profiles;
drop policy if exists "actualizar mi ficha" on public.acyzlab_profiles;
create policy "ver mi ficha y la de mis amigos" on public.acyzlab_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.acyzlab_are_connected((select auth.uid()), user_id));
-- el correo de la ficha debe ser el de tu cuenta (nadie puede hacerse pasar por otro)
create policy "crear mi ficha" on public.acyzlab_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and lower(email) = lower((select auth.jwt() ->> 'email')));
create policy "actualizar mi ficha" on public.acyzlab_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and lower(email) = lower((select auth.jwt() ->> 'email')));

-- Reglas de las amistades
drop policy if exists "ver mis solicitudes" on public.acyzlab_friendships;
drop policy if exists "enviar solicitud" on public.acyzlab_friendships;
drop policy if exists "aceptar solicitud" on public.acyzlab_friendships;
drop policy if exists "borrar amistad" on public.acyzlab_friendships;
create policy "ver mis solicitudes" on public.acyzlab_friendships
  for select to authenticated using ((select auth.uid()) in (requester, addressee));
create policy "enviar solicitud" on public.acyzlab_friendships
  for insert to authenticated with check (requester = (select auth.uid()) and status = 'pending');
create policy "aceptar solicitud" on public.acyzlab_friendships
  for update to authenticated using (addressee = (select auth.uid())) with check (addressee = (select auth.uid()) and status = 'accepted');
create policy "borrar amistad" on public.acyzlab_friendships
  for delete to authenticated using ((select auth.uid()) in (requester, addressee));
-- al aceptar solo se puede cambiar el estado
revoke update on public.acyzlab_friendships from authenticated;
grant update (status) on public.acyzlab_friendships to authenticated;
