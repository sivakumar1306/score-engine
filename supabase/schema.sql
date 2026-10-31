-- =====================================================================
-- Score Engine — Smash Karts tournament database
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → Run
-- It is safe to re-run (it drops and recreates policies/functions/views).
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (char_length(username) between 2 and 24),
  game_id     text check (game_id is null or char_length(game_id) <= 40),
  kart_url    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.tournaments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 60),
  type           text not null check (type in ('solo', 'team')),
  total_matches  int  not null check (total_matches between 1 and 50),
  status         text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  host_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create table if not exists public.teams (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 40),
  color          text not null default '#ff3d71',
  created_at     timestamptz not null default now()
);

-- Everyone taking part in a tournament. team_id is set for team tournaments.
create table if not exists public.tournament_players (
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  player_id      uuid not null references public.profiles (id) on delete cascade,
  team_id        uuid references public.teams (id) on delete cascade,
  primary key (tournament_id, player_id)
);

create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments (id) on delete cascade,
  match_number    int  not null check (match_number >= 1),
  winner_team_id  uuid references public.teams (id) on delete set null,
  screenshot_url  text,
  entry_method    text not null default 'manual' check (entry_method in ('manual', 'ai')),
  played_at       timestamptz not null default now(),
  unique (tournament_id, match_number)
);

create table if not exists public.match_results (
  match_id   uuid not null references public.matches (id) on delete cascade,
  player_id  uuid not null references public.profiles (id) on delete cascade,
  kills      int  not null default 0 check (kills between 0 and 999),
  deaths     int  not null default 0 check (deaths between 0 and 999),
  position   int  check (position is null or position >= 1),
  primary key (match_id, player_id)
);

create index if not exists idx_teams_tournament on public.teams (tournament_id);
create index if not exists idx_tp_player on public.tournament_players (player_id);
create index if not exists idx_matches_tournament on public.matches (tournament_id);
create index if not exists idx_results_player on public.match_results (player_id);

-- ---------- New user → profile ----------------------------------------
-- Username and game id are passed as metadata during sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, game_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 'player_' || left(new.id::text, 8)),
    nullif(trim(new.raw_user_meta_data ->> 'game_id'), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper functions for permissions --------------------------

create or replace function public.is_tournament_host(tid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.tournaments where id = tid and host_id = auth.uid());
$$;

create or replace function public.is_match_host(mid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.id = mid and t.host_id = auth.uid()
  );
$$;

-- Is a username free? (used by the sign-up form before the account exists)
create or replace function public.username_available(name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(name)));
$$;

-- ---------- Row level security ----------------------------------------

alter table public.profiles            enable row level security;
alter table public.tournaments         enable row level security;
alter table public.teams               enable row level security;
alter table public.tournament_players  enable row level security;
alter table public.matches             enable row level security;
alter table public.match_results       enable row level security;

-- Everything is publicly readable (it's a public leaderboard).
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select using (true);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read tournaments" on public.tournaments;
create policy "read tournaments" on public.tournaments for select using (true);
drop policy if exists "create tournaments" on public.tournaments;
create policy "create tournaments" on public.tournaments for insert to authenticated
  with check (host_id = auth.uid());
drop policy if exists "host updates tournament" on public.tournaments;
create policy "host updates tournament" on public.tournaments for update
  using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "host deletes tournament" on public.tournaments;
create policy "host deletes tournament" on public.tournaments for delete
  using (host_id = auth.uid());

drop policy if exists "read teams" on public.teams;
create policy "read teams" on public.teams for select using (true);
drop policy if exists "host manages teams" on public.teams;
create policy "host manages teams" on public.teams for all to authenticated
  using (public.is_tournament_host(tournament_id))
  with check (public.is_tournament_host(tournament_id));

drop policy if exists "read tournament players" on public.tournament_players;
create policy "read tournament players" on public.tournament_players for select using (true);
drop policy if exists "host manages tournament players" on public.tournament_players;
create policy "host manages tournament players" on public.tournament_players for all to authenticated
  using (public.is_tournament_host(tournament_id))
  with check (public.is_tournament_host(tournament_id));

drop policy if exists "read matches" on public.matches;
create policy "read matches" on public.matches for select using (true);
drop policy if exists "host manages matches" on public.matches;
create policy "host manages matches" on public.matches for all to authenticated
  using (public.is_tournament_host(tournament_id))
  with check (public.is_tournament_host(tournament_id));

drop policy if exists "read match results" on public.match_results;
create policy "read match results" on public.match_results for select using (true);
drop policy if exists "host manages match results" on public.match_results;
create policy "host manages match results" on public.match_results for all to authenticated
  using (public.is_match_host(match_id))
  with check (public.is_match_host(match_id));

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- Leaderboard view ------------------------------------------
-- Kills from BOTH solo and team matches count towards a player's total.

drop view if exists public.player_stats;
create view public.player_stats with (security_invoker = on) as
select
  p.id,
  p.username,
  p.game_id,
  p.kart_url,
  p.created_at,
  coalesce(r.total_kills, 0)        as total_kills,
  coalesce(r.total_deaths, 0)       as total_deaths,
  coalesce(r.matches_played, 0)     as matches_played,
  coalesce(r.tournaments_played, 0) as tournaments_played,
  coalesce(w.team_wins, 0)          as team_wins
from public.profiles p
left join (
  select mr.player_id,
         sum(mr.kills)::int                   as total_kills,
         sum(mr.deaths)::int                  as total_deaths,
         count(*)::int                        as matches_played,
         count(distinct m.tournament_id)::int as tournaments_played
  from public.match_results mr
  join public.matches m on m.id = mr.match_id
  group by mr.player_id
) r on r.player_id = p.id
left join (
  select tp.player_id, count(*)::int as team_wins
  from public.tournament_players tp
  join public.matches m
    on m.tournament_id = tp.tournament_id
   and m.winner_team_id = tp.team_id
  group by tp.player_id
) w on w.player_id = p.id;

grant select on public.player_stats to anon, authenticated;

-- ---------- Storage buckets -------------------------------------------

insert into storage.buckets (id, name, public)
values ('karts', 'karts', true), ('screenshots', 'screenshots', true)
on conflict (id) do update set public = true;

drop policy if exists "public read karts and screenshots" on storage.objects;
create policy "public read karts and screenshots" on storage.objects for select
  using (bucket_id in ('karts', 'screenshots'));

drop policy if exists "users upload to own folder" on storage.objects;
create policy "users upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('karts', 'screenshots') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own files" on storage.objects;
create policy "users update own files" on storage.objects for update to authenticated
  using (bucket_id in ('karts', 'screenshots') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own files" on storage.objects;
create policy "users delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('karts', 'screenshots') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Realtime (live leaderboard) -------------------------------

do $$
begin
  begin alter publication supabase_realtime add table public.match_results; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.matches;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles;      exception when duplicate_object then null; end;
end $$;
