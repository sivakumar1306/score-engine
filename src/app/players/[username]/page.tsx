"use client";
import { motion } from "framer-motion";
import { Crosshair, Gamepad2, Skull, Swords, Trophy, UserX } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { KartAvatar } from "@/components/KartAvatar";
import { Badge, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { PlayerStats } from "@/lib/types";
import { kd } from "@/lib/utils";

type HistoryRow = {
  kills: number;
  deaths: number;
  matches: { match_number: number; played_at: string; winner_team_id: string | null; tournaments: { id: string; name: string; type: string } | null } | null;
};

export default function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const name = decodeURIComponent(username);
  const [p, setP] = useState<PlayerStats | null | undefined>(undefined);
  const [rank, setRank] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    (async () => {
      const { data } = await sb.from("player_stats").select("*").eq("username", name).maybeSingle();
      setP((data as PlayerStats) ?? null);
      if (!data) return;
      const [{ count }, hist] = await Promise.all([
        sb.from("player_stats").select("id", { count: "exact", head: true }).gt("total_kills", data.total_kills),
        sb
          .from("match_results")
          .select("kills, deaths, matches(match_number, played_at, winner_team_id, tournaments(id, name, type))")
          .eq("player_id", data.id)
          .limit(200),
      ]);
      setRank((count ?? 0) + 1);
      const rows = ((hist.data as unknown as HistoryRow[]) ?? []).sort((a, b) => (b.matches?.played_at ?? "").localeCompare(a.matches?.played_at ?? ""));
      setHistory(rows.slice(0, 30));
    })();
  }, [name]);

  if (p === undefined) return <Skeleton className="h-80" />;
  if (p === null) return <EmptyState icon={<UserX className="size-6" />} title="Player not found" action={<LinkButton href="/players">All players</LinkButton>} />;

  const best = history.reduce((m, h) => Math.max(m, h.kills), 0);
  const stats = [
    { icon: Crosshair, label: "Kills", value: p.total_kills, color: "text-hot" },
    { icon: Skull, label: "Deaths", value: p.total_deaths, color: "text-muted" },
    { icon: Swords, label: "Matches", value: p.matches_played, color: "text-cyan" },
    { icon: Trophy, label: "Team wins", value: p.team_wins, color: "text-gold" },
  ];

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="pointer-events-none absolute -left-20 top-0 size-80 rounded-full bg-hot/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <motion.div initial={{ scale: 0.6, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }} className="animate-float">
            <KartAvatar url={p.kart_url} name={p.username} size={170} glow="rgb(255 61 113 / 0.55)" />
          </motion.div>
          <div className="flex-1">
            {rank && <Badge color="hot" className="mb-2">Rank #{rank}</Badge>}
            <h1 className="font-display text-4xl font-bold sm:text-5xl">{p.username}</h1>
            {p.game_id && <p className="mt-1 flex items-center justify-center gap-1.5 text-muted sm:justify-start"><Gamepad2 className="size-4" /> {p.game_id}</p>}
            <p className="mt-2 text-sm text-muted">
              K/D {kd(p.total_kills, p.total_deaths)} · {p.tournaments_played} tournaments · best match {best} kills
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="glass rounded-2xl p-4">
            <s.icon className={`mb-2 size-5 ${s.color}`} />
            <div className="font-display text-3xl font-bold"><CountUp value={s.value} /></div>
            <div className="text-xs text-muted">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Recent matches</h2>
        {history.length === 0 ? (
          <EmptyState icon={<Swords className="size-6" />} title="No matches yet" />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            {history.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <Link href={h.matches?.tournaments ? `/tournaments/${h.matches.tournaments.id}` : "#"} className="flex items-center gap-4 border-b border-line/60 px-5 py-3 transition last:border-0 hover:bg-white/[0.04]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{h.matches?.tournaments?.name ?? "Tournament"}</div>
                    <div className="text-xs text-muted">
                      Match {h.matches?.match_number} · {h.matches?.tournaments?.type === "team" ? "Team" : "Solo"} · {h.matches ? new Date(h.matches.played_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold">{h.kills}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted">kills</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
