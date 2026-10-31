"use client";
import { motion } from "framer-motion";
import { Check, Copy, Globe2 } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { CountUp } from "./CountUp";

/** Shows the player's in-game Smash Karts profile (read from their screenshot). */
export function GameProfileCard({ p }: { p: Profile }) {
  const [copied, setCopied] = useState(false);
  if (!p.sk_updated_at) return null;

  const [xpNow, xpMax] = (p.sk_xp ?? "").split("/").map((s) => parseInt(s.replace(/\D/g, "")));
  const xpPct = xpNow && xpMax ? Math.min(100, (xpNow / xpMax) * 100) : null;
  const rows: { label: string; value: number | null | undefined; dec?: boolean }[] = [
    { label: "Kills", value: p.sk_kills },
    { label: "Deaths", value: p.sk_deaths },
    { label: "KDR", value: p.sk_kdr, dec: true },
    { label: "Wins", value: p.sk_wins },
    { label: "Games", value: p.sk_games },
    { label: "Revenge kills", value: p.sk_revenge_kills },
    { label: "Bot kills", value: p.sk_bot_kills },
    { label: "Win rate", value: p.sk_wins != null && p.sk_games ? Math.round((p.sk_wins / p.sk_games) * 100) : null },
  ];

  const copy = async () => {
    if (!p.sk_id) return;
    await navigator.clipboard.writeText(p.sk_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative overflow-hidden rounded-3xl border border-cyan/25 bg-[linear-gradient(135deg,rgb(61_201_255/0.12),rgb(61_120_255/0.06)_50%,transparent)] p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-cyan/15 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center gap-4">
          {p.sk_level != null && (
            <motion.div initial={{ rotate: -30, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.25 }} className="relative grid size-14 place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full drop-shadow-[0_6px_14px_rgb(255_61_113/0.5)]">
                <polygon points="50,2 62,14 79,10 83,27 98,36 90,52 98,68 83,75 79,92 62,87 50,98 38,87 21,92 17,75 2,68 10,52 2,36 17,27 21,10 38,14" fill="#ff8a8a" />
                <circle cx="50" cy="50" r="34" fill="#d71f2a" />
              </svg>
              <span className="relative font-display text-xl font-bold text-white">{p.sk_level}</span>
            </motion.div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan">In-game profile</div>
            <div className="truncate font-display text-2xl font-bold">{p.sk_name ?? p.username}</div>
            {p.sk_region && <div className="flex items-center gap-1 text-sm text-muted"><Globe2 className="size-3.5" /> {p.sk_region}</div>}
          </div>
        </div>

        {xpPct != null && (
          <div className="mb-5">
            <div className="mb-1.5 flex justify-between text-xs text-muted"><span>XP</span><span>{p.sk_xp}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-cyan),#7c8bff)]" initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rows.filter((r) => r.value != null).map((r, i) => (
            <motion.div key={r.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }} className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{r.label}</div>
              <div className="font-display text-xl font-bold">
                {r.dec ? Number(r.value).toFixed(2) : <CountUp value={Number(r.value)} />}
                {r.label === "Win rate" && "%"}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          {p.sk_id ? (
            <button onClick={copy} className="group flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 transition hover:bg-white/[0.08]">
              <span className="font-semibold text-ink/80">SKID</span>
              <span className="truncate font-mono text-ink">{p.sk_id}</span>
              {copied ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5 opacity-60 group-hover:opacity-100" />}
            </button>
          ) : <span />}
          <span>Synced {new Date(p.sk_updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.section>
  );
}
