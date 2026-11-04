-- Acyz Lab: entrenar juntos (duelos en vivo entre amigos).
-- Pégalo en Supabase → SQL Editor → New query → Run (después de amigos.sql).

create table if not exists public.acyzlab_duels (
  id              bigint generated always as identity primary key,
  challenger      uuid not null references auth.users (id) on delete cascade,
  rival           uuid not null references auth.users (id) on delete cascade,
  status          text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'cancelled', 'finished')),
  challenger_pct  int not null default 0 check (challenger_pct between 0 and 100),
  rival_pct       int not null default 0 check (rival_pct between 0 and 100),
  challenger_done timestamptz,
  rival_done      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (challenger <> rival)
);
create index if not exists acyzlab_duels_rival on public.acyzlab_duels (rival, status);
alter table public.acyzlab_duels enable row level security;

-- ¿Son amigos (solicitud aceptada)?
create or replace function public.acyzlab_are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from acyzlab_friendships f
    where f.status = 'accepted' and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  );
$$;
revoke all on function public.acyzlab_are_friends(uuid, uuid) from public, anon;
grant execute on function public.acyzlab_are_friends(uuid, uuid) to authenticated;

drop policy if exists "ver mis duelos" on public.acyzlab_duels;
drop policy if exists "retar a un amigo" on public.acyzlab_duels;
drop policy if exists "actualizar mis duelos" on public.acyzlab_duels;
create policy "ver mis duelos" on public.acyzlab_duels
  for select to authenticated using ((select auth.uid()) in (challenger, rival));
create policy "retar a un amigo" on public.acyzlab_duels
  for insert to authenticated
  with check (challenger = (select auth.uid()) and status = 'invited' and public.acyzlab_are_friends(challenger, rival));
create policy "actualizar mis duelos" on public.acyzlab_duels
  for update to authenticated using ((select auth.uid()) in (challenger, rival)) with check ((select auth.uid()) in (challenger, rival));
-- solo se pueden cambiar el estado y el progreso
revoke update on public.acyzlab_duels from authenticated;
grant update (status, challenger_pct, rival_pct, challenger_done, rival_done, updated_at) on public.acyzlab_duels to authenticated;
