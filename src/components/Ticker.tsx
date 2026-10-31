"use client";
import { Crosshair } from "lucide-react";
import type { PlayerStats } from "@/lib/types";
import { KartAvatar } from "./KartAvatar";

/** Endless scrolling strip of racers and their kills. */
export function Ticker({ players }: { players: PlayerStats[] }) {
  if (players.length < 2) return null;
  const items = [...players.slice(0, 15)];
  const row = [...items, ...items];
  return (
    <div className="relative -mx-4 overflow-hidden border-y border-line bg-white/[0.02] py-3 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max gap-8" style={{ animation: `marquee ${Math.max(20, items.length * 4)}s linear infinite` }}>
        {row.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 whitespace-nowrap text-sm">
            <KartAvatar url={p.kart_url} name={p.username} size={28} className="rounded-md" />
            <span className="font-semibold">{p.username}</span>
            <span className="flex items-center gap-1 text-muted"><Crosshair className="size-3.5 text-hot" />{p.total_kills}</span>
            <span className="ml-6 text-hot/40">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
