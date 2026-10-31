"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { PlayerStats } from "@/lib/types";
import { kd } from "@/lib/utils";
import { KartAvatar } from "./KartAvatar";

export function LeaderboardTable({ players, ranks }: { players: PlayerStats[]; ranks?: number[] }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted sm:grid-cols-[3.5rem_1fr_6rem_6rem_5rem_6rem] sm:px-6">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Kills</span>
        <span className="hidden text-right sm:block">Matches</span>
        <span className="hidden text-right sm:block">K/D</span>
        <span className="hidden text-right sm:block">Team wins</span>
      </div>
      <motion.ul layout>
        <AnimatePresence initial={true}>
          {players.map((p, i) => (
            <motion.li
              layout
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i, 15) * 0.035, type: "spring", stiffness: 300, damping: 30 }}
            >
              <Link
                href={`/players/${encodeURIComponent(p.username)}`}
                className="group grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3 border-b border-line/60 px-4 py-3 transition-colors last:border-0 hover:bg-white/[0.04] sm:grid-cols-[3.5rem_1fr_6rem_6rem_5rem_6rem] sm:px-6"
              >
                <span className="font-display text-lg font-bold text-muted group-hover:text-ink">{ranks?.[i] ?? i + 1}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <KartAvatar url={p.kart_url} name={p.username} size={42} className="rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.username}</span>
                    {p.game_id && <span className="block truncate text-xs text-muted">ID: {p.game_id}</span>}
                  </span>
                </span>
                <span className="text-right font-display text-lg font-bold">{p.total_kills}</span>
                <span className="hidden text-right text-muted sm:block">{p.matches_played}</span>
                <span className="hidden text-right text-muted sm:block">{kd(p.total_kills, p.total_deaths)}</span>
                <span className="hidden text-right text-muted sm:block">{p.team_wins}</span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
