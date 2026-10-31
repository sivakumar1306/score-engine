"use client";
import { getSupabase } from "./supabase/client";

/** Removes the background in the browser. Returns null if this device can't run it. */
export async function removeBg(blob: Blob, onProgress?: (pct: number) => void): Promise<Blob | null> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    return await removeBackground(blob, {
      model: "isnet_quint8",
      output: { format: "image/png" },
      progress: (_k: string, cur: number, total: number) => total && onProgress?.(Math.round((cur / total) * 100)),
    });
  } catch {
    return null;
  }
}

/** Uploads a kart image and saves it as the user's kart. Returns the public URL. */
export async function saveKart(userId: string, blob: Blob): Promise<string> {
  const sb = getSupabase();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/kart-${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from("karts").upload(path, blob, { contentType: blob.type, upsert: true });
  if (upErr) throw upErr;
  const url = sb.storage.from("karts").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("profiles").update({ kart_url: url }).eq("id", userId);
  if (error) throw error;
  return url;
}
