"use client";
import type { BuilderValue } from "@/components/TournamentBuilder";
import { getSupabase } from "./supabase/client";

/** Creates a tournament (or updates it when `existingId` is set) with its teams and roster. */
export async function saveTournament(v: BuilderValue, hostId: string, existingId?: string): Promise<string> {
  const sb = getSupabase();
  let id = existingId;
  if (!id) {
    const { data, error } = await sb
      .from("tournaments")
      .insert({ name: v.name.trim(), type: v.type, total_matches: v.total_matches, host_id: hostId })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id as string;
  } else {
    const { error } = await sb.from("tournaments").update({ name: v.name.trim(), total_matches: v.total_matches }).eq("id", id);
    if (error) throw error;
  }

  let rows: { tournament_id: string; player_id: string; team_id: string | null }[] = [];
  if (v.type === "solo") {
    rows = v.soloPlayers.map((p) => ({ tournament_id: id!, player_id: p, team_id: null }));
  } else {
    if (existingId) {
      const { data: current } = await sb.from("teams").select("id").eq("tournament_id", id);
      const keep = new Set(v.teams.map((t) => t.id).filter(Boolean));
      const remove = (current ?? []).map((t) => t.id as string).filter((tid) => !keep.has(tid));
      if (remove.length) {
        const { error } = await sb.from("teams").delete().in("id", remove);
        if (error) throw error;
      }
    }
    for (const t of v.teams) {
      if (t.id) {
        const { error } = await sb.from("teams").update({ name: t.name.trim(), color: t.color }).eq("id", t.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("teams").insert({ tournament_id: id, name: t.name.trim(), color: t.color }).select("id").single();
        if (error) throw error;
        t.id = data.id as string;
      }
      rows.push(...t.players.map((p) => ({ tournament_id: id!, player_id: p, team_id: t.id! })));
    }
  }

  if (existingId) {
    const { error } = await sb.from("tournament_players").delete().eq("tournament_id", id);
    if (error) throw error;
  }
  if (rows.length) {
    const { error } = await sb.from("tournament_players").insert(rows);
    if (error) throw error;
  }
  return id!;
}
