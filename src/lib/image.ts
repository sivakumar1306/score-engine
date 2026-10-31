"use client";

/** Load a File/Blob/URL into an HTMLImageElement. */
export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}

/** Downscale an image to fit `maxSide` and return a JPEG data URL (keeps uploads small & fast). */
export async function fileToDataUrl(file: Blob, maxSide = 1600, quality = 0.88): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Crop an image with a Gemini-style box [ymin, xmin, ymax, xmax] normalised to 0..1000.
 * Adds a little padding so the kart is not clipped. Returns a PNG blob.
 */
export async function cropToBox(src: string, box: [number, number, number, number], pad = 0.06): Promise<Blob> {
  const img = await loadImage(src);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  let [y0, x0, y1, x1] = box.map((v) => Math.max(0, Math.min(1000, v)) / 1000);
  const pw = (x1 - x0) * pad;
  const ph = (y1 - y0) * pad;
  x0 = Math.max(0, x0 - pw);
  y0 = Math.max(0, y0 - ph);
  x1 = Math.min(1, x1 + pw);
  y1 = Math.min(1, y1 + ph);
  const sw = Math.max(1, Math.round((x1 - x0) * W));
  const sh = Math.max(1, Math.round((y1 - y0) * H));
  const canvas = document.createElement("canvas");
  const maxSide = 700;
  const s = Math.min(1, maxSide / Math.max(sw, sh));
  canvas.width = Math.round(sw * s);
  canvas.height = Math.round(sh * s);
  canvas.getContext("2d")!.drawImage(img, x0 * W, y0 * H, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Crop failed"))), "image/png"));
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
