-- Acyz Lab: avisos con la app cerrada (notificaciones push).
-- Pégalo en Supabase → SQL Editor → New query → Run (después de duelos.sql).

-- Dispositivos que aceptaron recibir avisos
create table if not exists public.acyzlab_push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.acyzlab_push_subs enable row level security;
drop policy if exists "ver mis avisos" on public.acyzlab_push_subs;
drop policy if exists "crear mis avisos" on public.acyzlab_push_subs;
drop policy if exists "cambiar mis avisos" on public.acyzlab_push_subs;
drop policy if exists "borrar mis avisos" on public.acyzlab_push_subs;
create policy "ver mis avisos" on public.acyzlab_push_subs for select to authenticated using (user_id = (select auth.uid()));
create policy "crear mis avisos" on public.acyzlab_push_subs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "cambiar mis avisos" on public.acyzlab_push_subs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "borrar mis avisos" on public.acyzlab_push_subs for delete to authenticated using (user_id = (select auth.uid()));

-- Claves del servidor de avisos (privadas: sin reglas, solo el servidor puede leerlas)
create table if not exists public.acyzlab_push_keys (
  id          int primary key default 1 check (id = 1),
  public_key  text not null,
  private_key text not null
);
alter table public.acyzlab_push_keys enable row level security;

-- Registro para no avisar dos veces de lo mismo (privado)
create table if not exists public.acyzlab_push_log (
  key        text primary key,
  created_at timestamptz not null default now()
);
alter table public.acyzlab_push_log enable row level security;

-- Cada 10 minutos, comprobar misiones sorpresa
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule(
  'acyzlab-misiones',
  '*/10 * * * *',
  $$ select net.http_post(
       url := 'https://cegnqgqftdiramaoebsy.supabase.co/functions/v1/acyzlab-push',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"kind": "quests"}'::jsonb
     ); $$
);
