-- Acyz Lab: tabla para guardar el progreso de cada usuario.
-- (Vive dentro del proyecto CC17; por eso lleva el prefijo acyzlab_.)
-- Pégalo en Supabase → SQL Editor → New query → Run.

create table if not exists public.acyzlab_user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seguridad: cada persona solo puede ver y cambiar su propia fila.
alter table public.acyzlab_user_data enable row level security;

drop policy if exists "leer mis datos" on public.acyzlab_user_data;
drop policy if exists "crear mis datos" on public.acyzlab_user_data;
drop policy if exists "actualizar mis datos" on public.acyzlab_user_data;
drop policy if exists "borrar mis datos" on public.acyzlab_user_data;

create policy "leer mis datos" on public.acyzlab_user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear mis datos" on public.acyzlab_user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "actualizar mis datos" on public.acyzlab_user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar mis datos" on public.acyzlab_user_data
  for delete to authenticated using ((select auth.uid()) = user_id);
