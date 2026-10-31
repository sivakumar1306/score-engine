"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PlayerStats } from "@/lib/types";

/** All players' lifetime stats, sorted by kills, kept live via Supabase realtime. */
export function usePlayerStats() {
  const [players, setPlayers] = useState<PlayerStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("player_stats")
      .select("*")
      .order("total_kills", { ascending: false })
      .order("matches_played", { ascending: true })
      .order("username");
    if (error) setError(error.message);
    else setPlayers(data as PlayerStats[]);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPlayers([]);
      return;
    }
    load();
    let t: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(load, 400);
    };
    const ch = getSupabase()
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_results" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debounced)
      .subscribe();
    return () => {
      clearTimeout(t);
      getSupabase().removeChannel(ch);
    };
  }, [load]);

  return { players, error, reload: load };
}
