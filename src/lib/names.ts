/** Fuzzy matching of names read from a screenshot to registered players. */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9 * (Math.min(x.length, y.length) / Math.max(x.length, y.length)) + 0.1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

type Candidate = { id: string; names: string[] };

/**
 * Assigns each screen name to at most one candidate (greedy, best score first).
 * Returns array aligned with `screenNames`.
 */
export function matchNames(
  screenNames: string[],
  candidates: Candidate[],
  threshold = 0.55,
): { id: string | null; score: number }[] {
  const pairs: { i: number; id: string; score: number }[] = [];
  screenNames.forEach((name, i) => {
    for (const c of candidates) {
      const score = Math.max(...c.names.filter(Boolean).map((n) => similarity(name, n)), 0);
      if (score >= threshold) pairs.push({ i, id: c.id, score });
    }
  });
  pairs.sort((a, b) => b.score - a.score);
  const out: { id: string | null; score: number }[] = screenNames.map(() => ({ id: null, score: 0 }));
  const used = new Set<string>();
  for (const p of pairs) {
    if (out[p.i].id || used.has(p.id)) continue;
    out[p.i] = { id: p.id, score: p.score };
    used.add(p.id);
  }
  return out;
}
