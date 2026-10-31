"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Match, MatchResult, Profile, Team, Tournament } from "@/lib/types";

export type RosterPlayer = Profile & { team_id: string | null };

export type TournamentData = {
  tournament: Tournament;
  host: Profile | null;
  teams: Team[];
  roster: RosterPlayer[];
  matches: Match[];
  results: MatchResult[];
};

export function useTournament(id: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const { data: t } = await sb.from("tournaments").select("*").eq("id", id).maybeSingle();
    if (!t) return setNotFound(true);
    const [host, teams, roster, matches] = await Promise.all([
      sb.from("profiles").select("*").eq("id", t.host_id).maybeSingle(),
      sb.from("teams").select("*").eq("tournament_id", id).order("created_at"),
      sb.from("tournament_players").select("team_id, profiles(*)").eq("tournament_id", id),
      sb.from("matches").select("*").eq("tournament_id", id).order("match_number"),
    ]);
    const matchIds = (matches.data ?? []).map((m) => m.id);
    const results = matchIds.length ? await sb.from("match_results").select("*").in("match_id", matchIds) : { data: [] };
    setData({
      tournament: t as Tournament,
      host: (host.data as Profile) ?? null,
      teams: (teams.data as Team[]) ?? [],
      roster: (roster.data ?? [])
        .map((r) => ({ ...(r.profiles as unknown as Profile), team_id: r.team_id as string | null }))
        .filter((p) => p.id)
        .sort((a, b) => a.username.localeCompare(b.username)),
      matches: (matches.data as Match[]) ?? [],
      results: (results.data as MatchResult[]) ?? [],
    });
  }, [id]);

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setTimeout>;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 350);
    };
    const sb = getSupabase();
    const ch = sb
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_results" }, reload)
      .subscribe();
    return () => {
      clearTimeout(timer);
      sb.removeChannel(ch);
    };
  }, [id, load]);

  return { data, notFound, reload: load };
}

export type SoloStanding = { player: RosterPlayer; kills: number; deaths: number; played: number; perMatch: Record<number, number | null> };
export type TeamStanding = { team: Team; wins: number; kills: number; players: { player: RosterPlayer; kills: number }[] };

export function useStandings(d: TournamentData | null) {
  return useMemo(() => {
    if (!d) return { solo: [] as SoloStanding[], teams: [] as TeamStanding[] };
    const matchNo = new Map(d.matches.map((m) => [m.id, m.match_number]));
    const byPlayer = new Map<string, SoloStanding>();
    d.roster.forEach((p) => byPlayer.set(p.id, { player: p, kills: 0, deaths: 0, played: 0, perMatch: {} }));
    d.results.forEach((r) => {
      const s = byPlayer.get(r.player_id);
      if (!s) return;
      s.kills += r.kills;
      s.deaths += r.deaths;
      s.played += 1;
      s.perMatch[matchNo.get(r.match_id) ?? 0] = r.kills;
    });
    const solo = [...byPlayer.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.player.username.localeCompare(b.player.username));

    const teams: TeamStanding[] = d.teams.map((t) => {
      const members = solo.filter((s) => s.player.team_id === t.id);
      return {
        team: t,
        wins: d.matches.filter((m) => m.winner_team_id === t.id).length,
        kills: members.reduce((a, s) => a + s.kills, 0),
        players: members.map((s) => ({ player: s.player, kills: s.kills })),
      };
    });
    teams.sort((a, b) => b.wins - a.wins || b.kills - a.kills);
    return { solo, teams };
  }, [d]);
}
