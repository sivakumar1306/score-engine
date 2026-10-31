"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bot, Camera, Check, Crown, ImagePlus, Keyboard, Minus, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RosterPlayer, TournamentData } from "@/hooks/useTournament";
import { fileToDataUrl, dataUrlToBlob } from "@/lib/image";
import { getSupabase } from "@/lib/supabase/client";
import type { AnalyzeResponse, Match } from "@/lib/types";
import { cn } from "@/lib/utils";
import { KartAvatar } from "./KartAvatar";
import { Button, Segmented } from "./ui";

type RowState = { played: boolean; kills: number; deaths: number; ai?: boolean };

export function MatchResultModal({
  data,
  matchNumber,
  canEdit,
  userId,
  onClose,
  onSaved,
}: {
  data: TournamentData;
  matchNumber: number;
  canEdit: boolean;
  userId: string | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { tournament, teams, roster } = data;
  const existing: Match | undefined = data.matches.find((m) => m.match_number === matchNumber);
  const isTeam = tournament.type === "team";

  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    roster.forEach((p) => {
      const r = existing ? data.results.find((x) => x.match_id === existing.id && x.player_id === p.id) : undefined;
      init[p.id] = { played: existing ? !!r : true, kills: r?.kills ?? 0, deaths: r?.deaths ?? 0 };
    });
    return init;
  });
  const [winner, setWinner] = useState<string | null>(existing?.winner_team_id ?? null);
  const [tab, setTab] = useState<"manual" | "ai">(canEdit && !existing ? "ai" : "manual");
  const [shot, setShot] = useState<string | null>(null); // new screenshot (data URL)
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<AnalyzeResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const teamKills = useMemo(() => {
    const m = new Map<string, number>();
    roster.forEach((p) => p.team_id && rows[p.id]?.played && m.set(p.team_id, (m.get(p.team_id) ?? 0) + (rows[p.id]?.kills ?? 0)));
    return m;
  }, [rows, roster]);

  const setRow = (id: string, patch: Partial<RowState>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch, ai: patch.ai ?? false } }));

  const pickFile = async (f: File) => {
    setAiError(null);
    setAi(null);
    const url = await fileToDataUrl(f, 1800, 0.9);
    setShot(url);
    analyze(url);
  };

  const analyze = async (image: string) => {
    setAnalyzing(true);
    setAiError(null);
    try {
      const res = await fetch("/api/analyze-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, tournamentId: tournament.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setAi(json as AnalyzeResponse);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const remap = (index: number, playerId: string | null) => {
    if (!ai) return;
    const next = ai.rows.map((r, i) => (i === index ? { ...r, player_id: playerId, confidence: playerId ? 1 : 0 } : r.player_id === playerId && playerId ? { ...r, player_id: null, confidence: 0 } : r));
    setAi({ ...ai, rows: next });
  };

  const applyAi = () => {
    if (!ai) return;
    const next: Record<string, RowState> = {};
    roster.forEach((p) => (next[p.id] = { played: false, kills: 0, deaths: 0 }));
    ai.rows.forEach((r) => {
      if (r.player_id && next[r.player_id]) next[r.player_id] = { played: true, kills: r.kills, deaths: r.deaths ?? 0, ai: true };
    });
    setRows(next);
    if (isTeam && ai.winner_team_id) setWinner(ai.winner_team_id);
    setTab("manual");
  };

  const save = async () => {
    setError(null);
    const played = roster.filter((p) => rows[p.id]?.played);
    if (played.length === 0) return setError("Mark at least one player as played.");
    let win = winner;
    if (isTeam && !win) {
      const best = [...teamKills.entries()].sort((a, b) => b[1] - a[1]);
      if (best.length && (best.length === 1 || best[0][1] !== best[1][1])) win = best[0][0];
      else return setError("Pick the winning team.");
    }
    setSaving(true);
    try {
      const sb = getSupabase();
      let screenshot_url = existing?.screenshot_url ?? null;
      if (shot && userId) {
        const path = `${userId}/${tournament.id}-m${matchNumber}-${Date.now()}.jpg`;
        const { error: upErr } = await sb.storage.from("screenshots").upload(path, dataUrlToBlob(shot), { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        screenshot_url = sb.storage.from("screenshots").getPublicUrl(path).data.publicUrl;
      }
      const usedAi = !!ai || existing?.entry_method === "ai";
      const { data: m, error: mErr } = await sb
        .from("matches")
        .upsert(
          { tournament_id: tournament.id, match_number: matchNumber, winner_team_id: isTeam ? win : null, screenshot_url, entry_method: usedAi ? "ai" : "manual" },
          { onConflict: "tournament_id,match_number" },
        )
        .select("id")
        .single();
      if (mErr) throw mErr;
      const { error: dErr } = await sb.from("match_results").delete().eq("match_id", m.id);
      if (dErr) throw dErr;
      const { error: iErr } = await sb.from("match_results").insert(
        played.map((p, i) => ({ match_id: m.id, player_id: p.id, kills: rows[p.id].kills, deaths: rows[p.id].deaths, position: i + 1 })),
      );
      if (iErr) throw iErr;

      // keep tournament status in sync
      const recorded = new Set([...data.matches.map((x) => x.match_number), matchNumber]).size;
      const status = recorded >= tournament.total_matches ? "completed" : "live";
      if (status !== tournament.status) await sb.from("tournaments").update({ status }).eq("id", tournament.id);

      onSaved(existing ? `Match ${matchNumber} updated` : `Match ${matchNumber} recorded`);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Couldn't save");
      setSaving(false);
    }
  };

  const groups: { key: string; title: string | null; color?: string; players: RosterPlayer[] }[] = isTeam
    ? teams.map((t) => ({ key: t.id, title: t.name, color: t.color, players: roster.filter((p) => p.team_id === t.id) }))
    : [{ key: "all", title: null, players: roster }];

  const viewOnly = !canEdit;

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-hot">Match {matchNumber}</div>
            <h2 className="font-display text-xl font-bold">{viewOnly ? "Result" : existing ? "Edit result" : "Record result"}</h2>
          </div>
          <button onClick={onClose} className="grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-white/[0.06] hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {canEdit && (
            <div className="mb-5">
              <Segmented
                id="mtab"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "ai", label: <><Bot className="size-4" /> Screenshot (AI)</> },
                  { value: "manual", label: <><Keyboard className="size-4" /> Scores</> },
                ]}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === "ai" && canEdit ? (
              <motion.div key="ai" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-4">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
                {!shot ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
                    className="group flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center transition hover:border-hot/50 hover:bg-white/[0.03]"
                  >
                    <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-hot/15 text-hot transition-transform group-hover:scale-110"><ImagePlus className="size-6" /></div>
                    <div className="font-semibold">Upload the end-of-match scoreboard</div>
                    <div className="mt-1 text-sm text-muted">AI reads names and kills — you review before saving</div>
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot} alt="Match screenshot" className={cn("max-h-72 w-full object-contain bg-black/40 transition", analyzing && "opacity-50")} />
                    {analyzing && (
                      <>
                        <motion.div className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-hot/40 to-transparent" animate={{ top: ["-20%", "100%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
                        <div className="glass absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-bg/70 px-4 py-2 text-sm font-medium">
                          <Sparkles className="size-4 animate-pulse text-amber" /> Reading scoreboard…
                        </div>
                      </>
                    )}
                    {!analyzing && (
                      <button onClick={() => fileRef.current?.click()} className="glass absolute right-2 top-2 flex cursor-pointer items-center gap-1.5 rounded-lg bg-bg/70 px-2.5 py-1.5 text-xs font-medium">
                        <Camera className="size-3.5" /> Replace
                      </button>
                    )}
                  </div>
                )}

                {aiError && (
                  <div className="flex items-start gap-2 rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      {aiError}
                      <div className="mt-2 flex gap-3">
                        {shot && <button className="cursor-pointer font-semibold underline" onClick={() => analyze(shot)}>Try again</button>}
                        <button className="cursor-pointer font-semibold underline" onClick={() => setTab("manual")}>Enter manually</button>
                      </div>
                    </div>
                  </div>
                )}

                {ai && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">AI found {ai.rows.length} players</h3>
                      <span className="text-xs text-muted">Fix any wrong matches</span>
                    </div>
                    <div className="space-y-1.5">
                      {ai.rows.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={cn("grid grid-cols-[1fr_1fr_3.5rem] items-center gap-2 rounded-xl border px-3 py-2 text-sm", r.player_id ? "border-line bg-white/[0.03]" : "border-amber/40 bg-amber/10")}
                        >
                          <span className="truncate font-mono text-xs text-muted" title={r.name_on_screen}>“{r.name_on_screen}”</span>
                          <select
                            className="input py-1.5 text-sm"
                            value={r.player_id ?? ""}
                            onChange={(e) => remap(i, e.target.value || null)}
                          >
                            <option value="">— not in tournament —</option>
                            {roster.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
                          </select>
                          <span className="text-right font-display text-lg font-bold">{r.kills}</span>
                        </motion.div>
                      ))}
                    </div>
                    {ai.notes && <p className="text-xs text-muted">AI note: {ai.notes}</p>}
                    {isTeam && ai.winner_team_id && (
                      <p className="flex items-center gap-1.5 text-sm"><Crown className="size-4 text-gold" /> Winner looks like <b>{teams.find((t) => t.id === ai.winner_team_id)?.name}</b></p>
                    )}
                    <Button className="w-full" onClick={applyAi}><Check className="size-4" /> Apply & review</Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div key="manual" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                {viewOnly && existing?.screenshot_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={existing.screenshot_url} target="_blank" rel="noreferrer"><img src={existing.screenshot_url} alt="Match screenshot" className="max-h-64 w-full rounded-2xl border border-line bg-black/40 object-contain" /></a>
                )}
                {Object.values(rows).some((r) => r.ai) && (
                  <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2.5 text-sm text-cyan">
                    <Bot className="size-4" /> Filled from the screenshot — check the numbers, then save.
                  </div>
                )}

                {isTeam && (
                  <div>
                    <div className="mb-2 text-sm font-medium">Winning team</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {teams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          disabled={viewOnly}
                          onClick={() => setWinner(t.id)}
                          className={cn("relative cursor-pointer overflow-hidden rounded-xl border px-3 py-3 text-left transition disabled:cursor-default", winner === t.id ? "border-transparent" : "border-line bg-white/[0.03] hover:bg-white/[0.06]")}
                          style={winner === t.id ? { background: `${t.color}26`, boxShadow: `0 0 0 1.5px ${t.color}` } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                            <span className="truncate font-semibold">{t.name}</span>
                            {winner === t.id && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto"><Crown className="size-4 text-gold" /></motion.span>}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">{teamKills.get(t.id) ?? 0} kills</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {groups.map((g) => (
                  <div key={g.key}>
                    {g.title && (
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <span className="size-2.5 rounded-full" style={{ background: g.color }} /> {g.title}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {g.players.map((p) => {
                        const r = rows[p.id];
                        if (viewOnly && !r.played) return null;
                        return (
                          <div key={p.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 transition", r.played ? "border-line bg-white/[0.03]" : "border-transparent opacity-45", r.ai && "border-cyan/30")}>
                            {!viewOnly && (
                              <input type="checkbox" checked={r.played} onChange={(e) => setRow(p.id, { played: e.target.checked })} className="size-4 cursor-pointer accent-[var(--color-hot)]" title="Played this match" />
                            )}
                            <KartAvatar url={p.kart_url} name={p.username} size={32} className="rounded-lg" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.username}</span>
                            <Stepper label="K" value={r.kills} disabled={viewOnly || !r.played} onChange={(kills) => setRow(p.id, { kills })} />
                            <Stepper label="D" value={r.deaths} disabled={viewOnly || !r.played} onChange={(deaths) => setRow(p.id, { deaths })} muted />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {canEdit && (
          <div className="border-t border-line px-5 py-4 sm:px-6">
            {error && <p className="mb-3 text-sm text-hot">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={save} loading={saving} disabled={tab === "ai" && !ai && !existing}>
                <Check className="size-4" /> Save result
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Stepper({ label, value, onChange, disabled, muted }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-center rounded-lg border border-line bg-black/20", muted && "max-sm:hidden")}>
      <span className="pl-2 text-[10px] font-bold text-muted">{label}</span>
      {!disabled && (
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="grid size-7 cursor-pointer place-items-center text-muted hover:text-ink"><Minus className="size-3" /></button>
      )}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={999}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))}
        className={cn("w-9 bg-transparent text-center font-display font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", disabled && "px-2", muted ? "text-sm text-muted" : "text-base")}
      />
      {!disabled && (
        <button type="button" onClick={() => onChange(Math.min(999, value + 1))} className="grid size-7 cursor-pointer place-items-center text-muted hover:text-ink"><Plus className="size-3" /></button>
      )}
    </div>
  );
}
