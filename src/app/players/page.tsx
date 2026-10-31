"use client";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { KartAvatar } from "@/components/KartAvatar";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { usePlayerStats } from "@/hooks/usePlayerStats";

export default function PlayersPage() {
  const { players } = usePlayerStats();
  const [q, setQ] = useState("");
  const list = (players ?? []).filter((p) => !q || p.username.toLowerCase().includes(q.toLowerCase()) || (p.game_id ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Racers"
        title="Players"
        subtitle="Everyone registered on the grid."
        action={
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      />
      {!players ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title="No players found" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(i, 16) * 0.035 }}>
              <Link href={`/players/${encodeURIComponent(p.username)}`} className="glass group flex flex-col items-center rounded-2xl px-4 pb-5 pt-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_20px_50px_-20px_rgb(255_61_113/0.45)]">
                <KartAvatar url={p.kart_url} name={p.username} size={92} glow="rgb(255 61 113 / 0.35)" className="transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                <div className="mt-3 w-full truncate font-display text-lg font-bold">{p.username}</div>
                {p.game_id && <div className="w-full truncate text-xs text-muted">{p.game_id}</div>}
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <span><b className="font-display text-base text-ink">{p.total_kills}</b> kills</span>
                  <span><b className="font-display text-base text-ink">{p.matches_played}</b> matches</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
