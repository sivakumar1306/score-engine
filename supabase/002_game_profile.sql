-- Run once in Supabase SQL Editor (after schema.sql). Safe to re-run.
-- Stores the player's in-game Smash Karts profile read from a screenshot.

alter table public.profiles
  add column if not exists sk_name           text,
  add column if not exists sk_id             text,
  add column if not exists sk_level          int,
  add column if not exists sk_xp             text,
  add column if not exists sk_region         text,
  add column if not exists sk_kills          int,
  add column if not exists sk_revenge_kills  int,
  add column if not exists sk_bot_kills      int,
  add column if not exists sk_deaths         int,
  add column if not exists sk_kdr            numeric(6,2),
  add column if not exists sk_wins           int,
  add column if not exists sk_games          int,
  add column if not exists sk_updated_at     timestamptz;

drop view if exists public.player_stats;
create view public.player_stats with (security_invoker = on) as
select
  p.*,
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
  join public.matches m on m.tournament_id = tp.tournament_id and m.winner_team_id = tp.team_id
  group by tp.player_id
) w on w.player_id = p.id;

grant select on public.player_stats to anon, authenticated;
