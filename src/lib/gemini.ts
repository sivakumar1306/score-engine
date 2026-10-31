import "server-only";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

/** Models tried in order; if one is overloaded/unavailable the next is used. */
function models(): string[] {
  const env = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL;
  return (env || "gemini-3.5-flash-lite,gemini-3.5-flash,gemini-3.8-flash,gemini-flash-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

type GeminiImage = { mimeType: string; base64: string };

/**
 * Sends a prompt + image to Gemini and returns parsed JSON that follows `schema`.
 * Retries across models on 429/5xx/404.
 */
export async function geminiJSON<T>(opts: {
  prompt: string;
  image: GeminiImage;
  schema: Record<string, unknown>;
}): Promise<{ data: T; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server.");

  const baseBody = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: opts.image.mimeType, data: opts.image.base64 } },
          { text: opts.prompt },
        ],
      },
    ],
  };
  const generationConfig = {
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: opts.schema,
  };

  const started = Date.now();
  const BUDGET_MS = 50_000; // stay under the 60s serverless limit
  let lastError = "Unknown error";
  for (const model of models()) {
    const remaining = BUDGET_MS - (Date.now() - started);
    if (remaining < 4_000) break;
    // Gemini 3.x: low thinking keeps image reading fast (~2-10s) without hurting accuracy
    const thinking = model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {};
    try {
      const res = await fetch(`${API}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ ...baseBody, generationConfig: { ...generationConfig, ...thinking } }),
        signal: AbortSignal.timeout(Math.min(25_000, remaining)),
      });
      const json = await res.json();
      if (!res.ok) {
        lastError = json?.error?.message || `HTTP ${res.status}`;
        if ([404, 429, 500, 502, 503, 504].includes(res.status)) continue;
        throw new Error(lastError);
      }
      const text: string | undefined = json?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("");
      if (!text) {
        lastError = "Empty response from model";
        continue;
      }
      return { data: JSON.parse(text) as T, model };
    } catch (e) {
      // network error, timeout, bad JSON or a 4xx — try the next model
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`AI is busy right now (${lastError}). Please try again or enter the result manually.`);
}

/** "data:image/png;base64,AAAA" → { mimeType, base64 } */
export function parseDataUrl(dataUrl: string): GeminiImage | null {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1] === "image/jpg" ? "image/jpeg" : m[1], base64: m[2] };
}
