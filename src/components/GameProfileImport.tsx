"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, IdCard, RefreshCw, ScanSearch, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReadProfileResult } from "@/app/api/read-profile/route";
import { cropToBox, fileToDataUrl } from "@/lib/image";
import { removeBg, saveKart } from "@/lib/kart";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

type Stage = "idle" | "reading" | "kart" | "review" | "error";
type Fields = Omit<ReadProfileResult, "kart_box">;

const FIELDS: { key: keyof Fields; label: string; type: "text" | "int" | "dec"; wide?: boolean }[] = [
  { key: "name", label: "In-game name", type: "text" },
  { key: "level", label: "Level", type: "int" },
  { key: "skid", label: "SKID", type: "text", wide: true },
  { key: "region", label: "Region", type: "text" },
  { key: "xp", label: "XP", type: "text" },
  { key: "kills", label: "Kills", type: "int" },
  { key: "deaths", label: "Deaths", type: "int" },
  { key: "kdr", label: "KDR", type: "dec" },
  { key: "revenge_kills", label: "Revenge kills", type: "int" },
  { key: "bot_kills", label: "Bot kills", type: "int" },
  { key: "wins", label: "Wins", type: "int" },
  { key: "games", label: "Games", type: "int" },
];

/**
 * Upload the Smash Karts profile screen → AI reads stats + SKID and crops the kart.
 * The player reviews everything, then it's saved to their profile.
 */
export function GameProfileImport({ userId, onSaved }: { userId: string; currentGameId?: string | null; onSaved: () => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [shot, setShot] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [kart, setKart] = useState<Blob | null>(null);
  const [useKart, setUseKart] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const kartUrl = useObjectUrl(kart);

  const process = async (file: File) => {
    setError(null);
    setFields(null);
    setKart(null);
    setProgress(0);
    try {
      const dataUrl = await fileToDataUrl(file, 1800, 0.9);
      setShot(dataUrl);
      setStage("reading");
      const res = await fetch("/api/read-profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't read the profile");
      const { kart_box, ...rest } = json as ReadProfileResult;
      setFields(rest);
      if (kart_box) {
        setStage("kart");
        const crop = await cropToBox(dataUrl, kart_box);
        const cut = await removeBg(crop, setProgress);
        setKart(cut ?? crop);
        setUseKart(true);
      } else {
        setUseKart(false);
      }
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("error");
    }
  };

  const save = async () => {
    if (!fields) return;
    setSaving(true);
    setError(null);
    try {
      if (useKart && kart) await saveKart(userId, kart);
      onSaved();
      reset();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setShot(null);
    setFields(null);
    setKart(null);
    setError(null);
  };

  const busy = stage === "reading" || stage === "kart";

  return (
    <div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); e.target.value = ""; }} />
      <AnimatePresence mode="wait">
        {stage === "idle" ? (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) process(f); }}
            className="group flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center transition hover:border-cyan/50 hover:bg-white/[0.03]"
          >
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-cyan/15 text-cyan transition-transform group-hover:scale-110 group-hover:-rotate-6"><IdCard className="size-6" /></div>
            <div className="font-semibold">Upload your Smash Karts profile screenshot</div>
            <div className="mt-1 max-w-sm text-sm text-muted">The screen with your level, kills, KDR and SKID. AI reads your stats and cuts out your kart in one go.</div>
          </motion.button>
        ) : (
          <motion.div key="work" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {busy && shot && (
              <div className="relative overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot} alt="" className="max-h-72 w-full object-contain opacity-50" />
                <motion.div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan/40 to-transparent" animate={{ top: ["-20%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                <div className="glass absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-bg/70 px-4 py-2 text-sm font-medium">
                  {stage === "reading" ? <ScanSearch className="size-4 animate-pulse text-cyan" /> : <Wand2 className="size-4 animate-pulse text-amber" />}
                  {stage === "reading" ? "Reading your profile…" : `Cutting out your kart… ${progress ? progress + "%" : ""}`}
                </div>
              </div>
            )}

            {stage === "review" && fields && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 sm:grid-cols-[200px_1fr]">
                <div className="space-y-2">
                  <div className="checker grid aspect-square place-items-center rounded-2xl border border-line">
                    {kartUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <motion.img src={kartUrl} alt="Kart" initial={{ scale: 0.7, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.6)]" />
                    ) : (
                      <span className="px-4 text-center text-xs text-muted">No kart found in this screenshot</span>
                    )}
                  </div>
                  {kart && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <input type="checkbox" checked={useKart} onChange={(e) => setUseKart(e.target.checked)} className="accent-[var(--color-hot)]" />
                      Use as my kart
                    </label>
                  )}
                </div>
                <div>
                  <p className="mb-3 text-xs text-muted">Read by AI from your screenshot and saved to your profile. If something is wrong, upload a clearer screenshot.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FIELDS.map((f, i) => (
                      <motion.label key={f.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }} className={cn("block", f.wide && "col-span-2")}>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">{f.label}</span>
                        <div className={cn("input truncate py-2 text-sm", f.key === "skid" && "font-mono text-xs", fields[f.key] == null && "text-muted")}>
                          {fields[f.key] ?? "—"}
                        </div>
                      </motion.label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {error && <div className="rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">{error}</div>}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy || saving}><RefreshCw className="size-4" /> Another screenshot</Button>
              {stage === "review" && <Button type="button" onClick={save} loading={saving}><Check className="size-4" /> Done</Button>}
              <Button type="button" variant="ghost" onClick={reset} disabled={busy || saving}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
