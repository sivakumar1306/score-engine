"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, RefreshCw, ScanSearch, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cropToBox, fileToDataUrl } from "@/lib/image";
import { removeBg, saveKart } from "@/lib/kart";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

type Stage = "idle" | "detecting" | "removing" | "ready" | "error";

/**
 * Upload a screenshot of your kart → Gemini finds the kart → we crop it →
 * background is removed in the browser → saved as a transparent PNG.
 */
export function KartUploader({ userId, onSaved, compact }: { userId: string; onSaved: (url: string) => void; compact?: boolean }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [original, setOriginal] = useState<string | null>(null);
  const [cropped, setCropped] = useState<Blob | null>(null);
  const [cutout, setCutout] = useState<Blob | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const result = useCutout && cutout ? cutout : cropped;
  const resultUrl = useObjectUrl(result);

  const process = useCallback(async (file: File) => {
    setError(null);
    setCropped(null);
    setCutout(null);
    setProgress(0);
    try {
      const dataUrl = await fileToDataUrl(file, 1600);
      setOriginal(dataUrl);
      setStage("detecting");
      const res = await fetch("/api/detect-kart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Detection failed");
      const crop = await cropToBox(dataUrl, json.box);
      setCropped(crop);
      setStage("removing");
      const out = await removeBg(crop, setProgress);
      setCutout(out);
      setUseCutout(!!out);
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("error");
    }
  }, []);

  const useOriginal = async () => {
    if (!original) return;
    const blob = await (await fetch(original)).blob();
    setCropped(blob);
    setCutout(null);
    setUseCutout(false);
    setStage("ready");
    setError(null);
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const url = await saveKart(userId, result);
      onSaved(url);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setOriginal(null);
    setCropped(null);
    setCutout(null);
    setError(null);
  };

  const busy = stage === "detecting" || stage === "removing";

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) process(f);
          e.target.value = "";
        }}
      />
      <AnimatePresence mode="wait">
        {stage === "idle" ? (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) process(f);
            }}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-all",
              compact ? "py-8" : "py-12",
              drag ? "border-hot bg-hot/10" : "border-line hover:border-hot/50 hover:bg-white/[0.03]",
            )}
          >
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-hot/15 text-hot transition-transform group-hover:scale-110 group-hover:-rotate-6">
              <ImagePlus className="size-6" />
            </div>
            <div className="font-semibold">Drop a screenshot of your kart</div>
            <div className="mt-1 text-sm text-muted">AI will find your kart, cut it out and use it as your avatar</div>
          </motion.button>
        ) : (
          <motion.div key="work" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="checker relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {stage === "ready" && resultUrl ? (
                <motion.img
                  key={resultUrl}
                  src={resultUrl}
                  alt="Your kart"
                  initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 16 }}
                  className="max-h-[85%] max-w-[85%] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)]"
                />
              ) : original ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={original} alt="" className={cn("size-full object-contain transition", busy && "opacity-50 blur-[1px]")} />
              ) : null}

              {busy && (
                <>
                  <motion.div
                    className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-hot/40 to-transparent"
                    animate={{ top: ["-20%", "100%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="glass absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-bg/70 px-4 py-2 text-sm font-medium">
                    {stage === "detecting" ? <ScanSearch className="size-4 animate-pulse text-hot" /> : <Wand2 className="size-4 animate-pulse text-amber" />}
                    {stage === "detecting" ? "Finding your kart…" : `Removing background… ${progress ? progress + "%" : ""}`}
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">
                {error}
                {original && (
                  <button type="button" onClick={useOriginal} className="ml-2 cursor-pointer font-semibold underline">
                    Use the full image instead
                  </button>
                )}
              </div>
            )}

            {stage === "ready" && cutout && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={useCutout} onChange={(e) => setUseCutout(e.target.checked)} className="accent-[var(--color-hot)]" />
                Remove background
              </label>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy || saving}>
                <RefreshCw className="size-4" /> Another image
              </Button>
              {stage === "ready" && (
                <Button type="button" onClick={save} loading={saving}>
                  <Sparkles className="size-4" /> Use this kart
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={reset} disabled={busy || saving}>
                Cancel
              </Button>
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
