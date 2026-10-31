"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Crown, Crosshair } from "lucide-react";
import Link from "next/link";
import type { PlayerStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { KartAvatar } from "./KartAvatar";
import { Confetti } from "./Confetti";

const RANKS = {
  1: { color: "var(--color-gold)", glow: "rgb(255 213 74 / 0.55)", height: "h-40 sm:h-56", label: "1ST" },
  2: { color: "var(--color-silver)", glow: "rgb(207 214 230 / 0.45)", height: "h-28 sm:h-40", label: "2ND" },
  3: { color: "var(--color-bronze)", glow: "rgb(224 138 79 / 0.5)", height: "h-20 sm:h-28", label: "3RD" },
} as const;

export function Podium({ top }: { top: PlayerStats[] }) {
  // Visual order: 2nd, 1st, 3rd
  const slots = [
    { p: top[1], rank: 2 as const },
    { p: top[0], rank: 1 as const },
    { p: top[2], rank: 3 as const },
  ];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-5">
      {slots.map(({ p, rank }, i) => (
        <PodiumSlot key={rank} player={p} rank={rank} delay={[0.25, 0.05, 0.45][i]} />
      ))}
    </div>
  );
}

function PodiumSlot({ player, rank, delay }: { player?: PlayerStats; rank: 1 | 2 | 3; delay: number }) {
  const r = RANKS[rank];
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: delay + 0.35, type: "spring", stiffness: 160, damping: 18 }}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
        onMouseMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - b.left) / b.width - 0.5);
          my.set((e.clientY - b.top) / b.height - 0.5);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        className="relative mb-3 flex w-full flex-col items-center"
      >
        {rank === 1 && player && <Confetti delay={delay + 1.1} />}
        {rank === 1 && (
          <motion.div initial={{ y: -10, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 1, type: "spring" }} className="mb-1">
            <Crown className="size-7 fill-gold text-gold drop-shadow-[0_0_12px_rgb(255_213_74/0.8)] sm:size-9" />
          </motion.div>
        )}
        {player ? (
          <Link href={`/players/${encodeURIComponent(player.username)}`} className="group flex flex-col items-center">
            <div className="animate-float" style={{ animationDelay: `${rank * -1.3}s` }}>
              <KartAvatar
                url={player.kart_url}
                name={player.username}
                size={rank === 1 ? 180 : 132}
                glow={r.glow}
                className="transition-transform duration-300 group-hover:scale-110 max-sm:!size-[72px]"
              />
            </div>
            <div className="mt-2 max-w-full truncate text-center font-display text-sm font-bold sm:text-lg">{player.username}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted sm:text-sm">
              <Crosshair className="size-3.5" style={{ color: r.color }} />
              <CountUp value={player.total_kills} className="font-semibold text-ink" /> kills
            </div>
          </Link>
        ) : (
          <div className="flex flex-col items-center opacity-40">
            <div className="grid size-[72px] place-items-center rounded-2xl border border-dashed border-line sm:size-24">?</div>
            <div className="mt-2 text-sm text-muted">Open spot</div>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ originY: 1, borderColor: `color-mix(in srgb, ${r.color} 40%, transparent)` }}
        className={cn("relative w-full overflow-hidden rounded-t-2xl border border-b-0", r.height)}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${r.color} 28%, transparent), transparent 85%)` }} />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: `sweep 3.5s ${delay + 1}s infinite` }} />
        </div>
        <div className="relative grid h-full place-items-center font-display text-2xl font-bold sm:text-4xl" style={{ color: r.color, textShadow: `0 0 24px ${r.glow}` }}>
          {r.label}
        </div>
      </motion.div>
    </div>
  );
}
