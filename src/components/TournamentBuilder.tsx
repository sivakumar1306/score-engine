"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Search, Swords, Trash2, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile, TournamentType } from "@/lib/types";
import { cn, TEAM_COLORS } from "@/lib/utils";
import { KartAvatar } from "./KartAvatar";
import { Button, Field, Segmented, Skeleton } from "./ui";

export type DraftTeam = { key: string; id?: string; name: string; color: string; players: string[] };
export type BuilderValue = { name: string; type: TournamentType; total_matches: number; soloPlayers: string[]; teams: DraftTeam[] };

let k = 0;
const newKey = () => `t${++k}-${Date.now()}`;

export function defaultTeams(): DraftTeam[] {
  return [
    { key: newKey(), name: "Team Red", color: TEAM_COLORS[0], players: [] },
    { key: newKey(), name: "Team Blue", color: TEAM_COLORS[1], players: [] },
  ];
}

export function TournamentBuilder({
  initial,
  lockType,
  minMatches = 1,
  submitLabel,
  onSubmit,
}: {
  initial: BuilderValue;
  lockType?: boolean;
  minMatches?: number;
  submitLabel: string;
  onSubmit: (v: BuilderValue) => Promise<void>;
}) {
  const [v, setV] = useState<BuilderValue>(initial);
  const [players, setPlayers] = useState<Profile[] | null>(null);
  const [q, setQ] = useState("");
  const [activeTeam, setActiveTeam] = useState(initial.teams[0]?.key ?? "");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabase()
      .from("profiles")
      .select("*")
      .order("username")
      .then(({ data }) => setPlayers((data as Profile[]) ?? []));
  }, []);

  const byId = useMemo(() => new Map((players ?? []).map((p) => [p.id, p])), [players]);
  const selected = useMemo(() => new Set(v.type === "solo" ? v.soloPlayers : v.teams.flatMap((t) => t.players)), [v]);
  const filtered = (players ?? []).filter((p) => {
    const s = q.toLowerCase();
    return !s || p.username.toLowerCase().includes(s) || (p.game_id ?? "").toLowerCase().includes(s);
  });

  const addPlayer = (id: string, teamKey?: string) => {
    setV((s) => {
      if (s.type === "solo") return s.soloPlayers.includes(id) ? s : { ...s, soloPlayers: [...s.soloPlayers, id] };
      const target = teamKey ?? activeTeam ?? s.teams[0]?.key;
      return { ...s, teams: s.teams.map((t) => ({ ...t, players: t.key === target ? [...t.players.filter((p) => p !== id), id] : t.players.filter((p) => p !== id) })) };
    });
  };
  const removePlayer = (id: string) =>
    setV((s) => ({ ...s, soloPlayers: s.soloPlayers.filter((p) => p !== id), teams: s.teams.map((t) => ({ ...t, players: t.players.filter((p) => p !== id) })) }));
  const updateTeam = (key: string, patch: Partial<DraftTeam>) => setV((s) => ({ ...s, teams: s.teams.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));
  const addTeam = () => {
    const nk = newKey();
    setV((s) => ({ ...s, teams: [...s.teams, { key: nk, name: `Team ${s.teams.length + 1}`, color: TEAM_COLORS[s.teams.length % TEAM_COLORS.length], players: [] }] }));
    setActiveTeam(nk);
  };
  const removeTeam = (key: string) => {
    setV((s) => ({ ...s, teams: s.teams.filter((t) => t.key !== key) }));
    if (activeTeam === key) setActiveTeam(v.teams.find((t) => t.key !== key)?.key ?? "");
  };

  const submit = async () => {
    setError(null);
    if (v.name.trim().length < 2) return setError("Give the tournament a name.");
    if (v.type === "solo" && v.soloPlayers.length < 2) return setError("Pick at least 2 players.");
    if (v.type === "team") {
      if (v.teams.length < 2) return setError("You need at least 2 teams.");
      if (v.teams.some((t) => !t.name.trim())) return setError("Every team needs a name.");
      if (new Set(v.teams.map((t) => t.name.trim().toLowerCase())).size !== v.teams.length) return setError("Team names must be different.");
      if (v.teams.some((t) => t.players.length === 0)) return setError("Every team needs at least one player.");
    }
    setSaving(true);
    try {
      await onSubmit(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Couldn't save");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="glass grid gap-5 rounded-2xl p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-6">
        <Field label="Tournament name">
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Friday Night Smash" maxLength={60} />
        </Field>
        <Field label="Mode">
          {lockType ? (
            <div className="input flex items-center gap-2 capitalize text-muted">{v.type === "solo" ? <User className="size-4" /> : <Users className="size-4" />} {v.type}</div>
          ) : (
            <Segmented
              id="mode"
              value={v.type}
              onChange={(type) => setV({ ...v, type })}
              options={[
                { value: "solo", label: <><User className="size-4" /> Solo</> },
                { value: "team", label: <><Users className="size-4" /> Team</> },
              ]}
            />
          )}
        </Field>
        <Field label="Matches">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-white/[0.03] p-1">
            <StepBtn onClick={() => setV({ ...v, total_matches: Math.max(minMatches, v.total_matches - 1) })}><Minus className="size-4" /></StepBtn>
            <motion.span key={v.total_matches} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-10 text-center font-display text-lg font-bold">
              {v.total_matches}
            </motion.span>
            <StepBtn onClick={() => setV({ ...v, total_matches: Math.min(50, v.total_matches + 1) })}><Plus className="size-4" /></StepBtn>
          </div>
        </Field>
      </div>
      <p className="-mt-3 px-1 text-xs text-muted">
        {v.type === "solo" ? "Solo: players are ranked by total kills across all matches." : "Team: teams are ranked by matches won. Kills still count toward each player's all-time total."}
      </p>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Registered players */}
        <div className="glass flex max-h-[640px] flex-col rounded-2xl p-4 lg:sticky lg:top-20">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold">Registered players</h3>
            <span className="text-xs text-muted">{players?.length ?? 0}</span>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input className="input py-2 pl-9 text-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {!players
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              : filtered.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      draggable={!isSel}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                      onClick={() => (isSel ? removePlayer(p.id) : addPlayer(p.id))}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                        isSel ? "bg-hot/10 opacity-60" : "hover:bg-white/[0.06]",
                      )}
                    >
                      <KartAvatar url={p.kart_url} name={p.username} size={34} className="rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.username}</span>
                        {p.game_id && <span className="block truncate text-xs text-muted">{p.game_id}</span>}
                      </span>
                      {isSel ? <X className="size-4 text-hot" /> : <Plus className="size-4 text-muted" />}
                    </button>
                  );
                })}
            {players && filtered.length === 0 && <p className="py-6 text-center text-sm text-muted">No players found</p>}
          </div>
          {v.type === "team" && <p className="mt-3 text-xs text-muted">Click a player to add to the highlighted team, or drag onto any team.</p>}
        </div>

        {/* Selection */}
        <div>
          <AnimatePresence mode="wait">
            {v.type === "solo" ? (
              <motion.div key="solo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass min-h-64 rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Players in this tournament</h3>
                  <span className="text-sm text-muted">{v.soloPlayers.length} selected</span>
                </div>
                {v.soloPlayers.length === 0 ? (
                  <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">Pick players from the list</div>
                ) : (
                  <motion.div layout className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <AnimatePresence>
                      {v.soloPlayers.map((id) => {
                        const p = byId.get(id);
                        if (!p) return null;
                        return <PlayerChip key={id} p={p} onRemove={() => removePlayer(id)} />;
                      })}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {v.teams.map((t) => (
                    <motion.div
                      layout
                      key={t.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setActiveTeam(t.key)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(t.key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const id = e.dataTransfer.getData("text/plain");
                        if (id) addPlayer(id, t.key);
                      }}
                      className={cn("glass relative min-h-52 cursor-pointer rounded-2xl p-4 transition-shadow", activeTeam === t.key && "ring-glow", dragOver === t.key && "bg-white/[0.08]")}
                      style={activeTeam === t.key ? { boxShadow: `0 0 0 1px ${t.color}88, 0 10px 40px -12px ${t.color}aa` } : undefined}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: t.color }} />
                      <div className="mb-3 flex items-center gap-2">
                        <ColorPicker value={t.color} onChange={(color) => updateTeam(t.key, { color })} />
                        <input
                          className="min-w-0 flex-1 bg-transparent font-display text-lg font-semibold outline-none"
                          value={t.name}
                          maxLength={40}
                          onChange={(e) => updateTeam(t.key, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs text-muted">{t.players.length}</span>
                        {v.teams.length > 2 && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeTeam(t.key); }} className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-hot/10 hover:text-hot">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <AnimatePresence>
                          {t.players.map((id) => {
                            const p = byId.get(id);
                            return p ? <PlayerChip key={id} p={p} onRemove={() => removePlayer(id)} /> : null;
                          })}
                        </AnimatePresence>
                        {t.players.length === 0 && (
                          <div className="grid h-24 place-items-center rounded-xl border border-dashed border-line text-center text-xs text-muted">
                            {activeTeam === t.key ? "Click players on the left to add them here" : "Drop players here"}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.button
                  layout
                  type="button"
                  onClick={addTeam}
                  className="grid min-h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line text-muted transition hover:border-hot/50 hover:text-ink"
                >
                  <span className="flex items-center gap-2 font-semibold"><Plus className="size-5" /> Add team</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">{error}</motion.p>}
      <div className="flex justify-end">
        <Button size="lg" onClick={submit} loading={saving}>
          <Swords className="size-5" /> {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function PlayerChip({ p, onRemove }: { p: Profile; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="group flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.04] p-2"
    >
      <KartAvatar url={p.kart_url} name={p.username} size={32} className="rounded-lg" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.username}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="cursor-pointer rounded-md p-1 text-muted opacity-60 transition hover:bg-hot/15 hover:text-hot group-hover:opacity-100">
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-white/[0.08] hover:text-ink active:scale-90">
      {children}
    </button>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="size-6 cursor-pointer rounded-full border-2 border-white/30" style={{ background: value }} aria-label="Team colour" />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="glass absolute left-0 top-8 z-20 grid grid-cols-4 gap-1.5 rounded-xl bg-surface p-2">
            {TEAM_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }} className={cn("size-6 cursor-pointer rounded-full transition hover:scale-110", c === value && "ring-2 ring-white")} style={{ background: c }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
