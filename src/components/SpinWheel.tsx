"use client";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { Check, Dices, FastForward, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { KartAvatar } from "./KartAvatar";
import { Button } from "./ui";
import type { DraftTeam } from "./TournamentBuilder";

const SLICE_COLORS = ["#ff3d71", "#3dc9ff", "#ffb800", "#7cff6b", "#b46bff", "#ff8a3d", "#ff6bd6", "#6bffe1"];

/**
 * Team roulette: every player goes on the wheel; each spin picks one and drops them
 * into the next team in turn, so teams stay balanced.
 */
export function SpinWheel({ players, teams, onApply, onClose }: { players: Profile[]; teams: DraftTeam[]; onApply: (byTeam: Record<string, string[]>) => void; onClose: () => void }) {
  const [pool, setPool] = useState<Profile[]>(players);
  const [result, setResult] = useState<Record<string, string[]>>(() => Object.fromEntries(teams.map((t) => [t.key, []])));
  const [spinning, setSpinning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [picked, setPicked] = useState<Profile | null>(null);
  const rotation = useMotionValue(0);
  const autoRef = useRef(false);

  const assignedCount = Object.values(result).reduce((n, a) => n + a.length, 0);
  const nextTeam = teams[assignedCount % teams.length];
  const done = pool.length === 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !spinning && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, spinning]);

  const spin = async (): Promise<void> => {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    setPicked(null);
    const n = pool.length;
    const idx = Math.floor(Math.random() * n);
    const slice = 360 / n;
    const center = idx * slice + slice / 2;
    const current = rotation.get();
    // land the chosen slice under the pointer at the top, after several full turns
    const base = current - (((current % 360) + 360) % 360);
    const target = base + 360 * (n === 1 ? 2 : 5 + Math.floor(Math.random() * 3)) + (360 - center);
    await animate(rotation, target, { duration: n === 1 ? 1.2 : 3.6, ease: [0.12, 0.8, 0.18, 1] });
    const p = pool[idx];
    setPicked(p);
    await new Promise((r) => setTimeout(r, 650));
    const team = teams[assignedCount % teams.length];
    setResult((r) => ({ ...r, [team.key]: [...r[team.key], p.id] }));
    setPool((pl) => pl.filter((x) => x.id !== p.id));
    setPicked(null);
    setSpinning(false);
  };

  // auto-spin until the wheel is empty
  useEffect(() => {
    autoRef.current = auto;
    if (auto && !spinning && pool.length > 0) {
      const t = setTimeout(() => autoRef.current && spin(), 250);
      return () => clearTimeout(t);
    }
    if (pool.length === 0) setAuto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, spinning, pool.length]);

  const reset = () => {
    setAuto(false);
    setPool(players);
    setResult(Object.fromEntries(teams.map((t) => [t.key, []])));
    setPicked(null);
  };

  const byId = new Map(players.map((p) => [p.id, p]));
  const n = pool.length;
  const R = 150;

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !spinning && onClose()} />
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-hot">Team roulette</div>
            <h2 className="font-display text-xl font-bold">Spin to pick the teams</h2>
          </div>
          <button onClick={onClose} disabled={spinning} className="grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-white/[0.06] hover:text-ink disabled:opacity-40">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
          {/* Wheel */}
          <div className="flex flex-col items-center">
            <div className="relative aspect-square w-full max-w-[380px]">
              {/* pointer */}
              <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
                <motion.div animate={spinning ? { rotate: [0, -18, 0] } : { rotate: 0 }} transition={spinning ? { duration: 0.18, repeat: Infinity } : undefined} style={{ originY: 0 }}>
                  <svg width="34" height="42" viewBox="0 0 34 42"><path d="M17 42 L2 8 A16 16 0 0 1 32 8 Z" fill="#fff" /><circle cx="17" cy="14" r="6" fill="var(--color-hot)" /></svg>
                </motion.div>
              </div>
              {/* glow ring */}
              <div className="absolute inset-0 rounded-full shadow-[0_0_60px_-10px_rgb(255_61_113/0.6)]" />
              <motion.svg viewBox="-160 -160 320 320" className="size-full" style={{ rotate: rotation }}>
                <circle r={R + 6} fill="#1b1b2a" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2" />
                {n === 0 ? (
                  <circle r={R} fill="#22222f" />
                ) : n === 1 ? (
                  <g>
                    <circle r={R} fill={SLICE_COLORS[0]} />
                    <text y={-R * 0.55} textAnchor="middle" className="fill-white font-display" fontSize="18" fontWeight="700">{pool[0].username.slice(0, 14)}</text>
                  </g>
                ) : (
                  pool.map((p, i) => {
                    const a0 = ((i * 360) / n - 90) * (Math.PI / 180);
                    const a1 = (((i + 1) * 360) / n - 90) * (Math.PI / 180);
                    const mid = ((i + 0.5) * 360) / n;
                    const large = 360 / n > 180 ? 1 : 0;
                    const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
                    const fs = n > 14 ? 10 : n > 9 ? 12 : 15;
                    return (
                      <g key={p.id}>
                        <path d={d} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#0f0f18" strokeWidth="2" opacity={picked && picked.id !== p.id ? 0.35 : 1} />
                        <g transform={`rotate(${mid - 90})`}>
                          <text x={R - 14} y="0" textAnchor="end" dominantBaseline="middle" className="fill-[#0f0f18] font-display" fontSize={fs} fontWeight="700">
                            {p.username.length > 12 ? p.username.slice(0, 11) + "…" : p.username}
                          </text>
                        </g>
                      </g>
                    );
                  })
                )}
                <circle r="26" fill="#0f0f18" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2" />
              </motion.svg>
              {/* centre */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <Dices className="size-6 text-white/80" />
              </div>
            </div>

            <div className="mt-5 h-14 text-center">
              <AnimatePresence mode="wait">
                {picked ? (
                  <motion.div key={picked.id} initial={{ scale: 0.6, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="font-display text-xl font-bold">
                    {picked.username} → <span style={{ color: nextTeam?.color }}>{nextTeam?.name}</span>
                  </motion.div>
                ) : done ? (
                  <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-xl font-bold text-lime">Teams are set!</motion.div>
                ) : (
                  <motion.div key="next" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted">
                    Next pick goes to <b style={{ color: nextTeam?.color }}>{nextTeam?.name}</b> · {pool.length} left
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={spin} disabled={spinning || done || auto} size="lg"><Dices className="size-5" /> Spin</Button>
              <Button variant="outline" onClick={() => setAuto(true)} disabled={done || auto}><FastForward className="size-4" /> Spin all</Button>
              <Button variant="ghost" onClick={reset} disabled={spinning}><RotateCcw className="size-4" /> Reset</Button>
            </div>
          </div>

          {/* Teams filling up */}
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {teams.map((t) => (
              <div key={t.key} className={cn("glass relative overflow-hidden rounded-2xl p-4 transition-shadow", !done && nextTeam?.key === t.key && "shadow-[0_0_0_1px_var(--tw-shadow-color)]")} style={{ ["--tw-shadow-color" as string]: t.color }}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: t.color }} />
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display font-bold">{t.name}</span>
                  <span className="text-xs text-muted">{result[t.key]?.length ?? 0}</span>
                </div>
                <div className="min-h-12 space-y-1.5">
                  <AnimatePresence>
                    {(result[t.key] ?? []).map((id) => {
                      const p = byId.get(id);
                      return p ? (
                        <motion.div key={id} layout initial={{ opacity: 0, scale: 0.5, x: -30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.04] p-2">
                          <KartAvatar url={p.kart_url} name={p.username} size={28} className="rounded-md" />
                          <span className="truncate text-sm font-medium">{p.username}</span>
                        </motion.div>
                      ) : null;
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={onClose} disabled={spinning}>Cancel</Button>
          <Button onClick={() => onApply(result)} disabled={!done || spinning}><Check className="size-4" /> Use these teams</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
