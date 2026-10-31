import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { geminiJSON, parseDataUrl } from "@/lib/gemini";
import { matchNames, similarity } from "@/lib/names";
import type { AnalyzeResponse, AnalyzedRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type GeminiOut = {
  is_results_screen: boolean;
  players: { name: string; kills: number; deaths?: number | null; position?: number | null; team_color?: string | null }[];
  winning_team_color?: string | null;
  notes?: string | null;
};

const schema = {
  type: "OBJECT",
  properties: {
    is_results_screen: { type: "BOOLEAN", description: "true if this looks like a match scoreboard / results screen" },
    players: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "player name exactly as shown" },
          kills: { type: "INTEGER" },
          deaths: { type: "INTEGER", nullable: true },
          position: { type: "INTEGER", nullable: true, description: "rank on the scoreboard, 1 = top" },
          team_color: { type: "STRING", nullable: true, description: "team colour of this row, e.g. red or blue, if teams are shown" },
        },
        required: ["name", "kills"],
      },
    },
    winning_team_color: { type: "STRING", nullable: true },
    notes: { type: "STRING", nullable: true, description: "short note about anything unclear" },
  },
  required: ["is_results_screen", "players"],
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { image, tournamentId } = (await req.json().catch(() => ({}))) as { image?: string; tournamentId?: string };
  const img = image ? parseDataUrl(image) : null;
  if (!img || !tournamentId) return NextResponse.json({ error: "Missing image or tournament." }, { status: 400 });
  if (img.base64.length > 6_000_000) return NextResponse.json({ error: "Image too large." }, { status: 413 });

  const { data: t } = await supabase.from("tournaments").select("id,type,host_id").eq("id", tournamentId).single();
  if (!t) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  if (t.host_id !== auth.user.id) return NextResponse.json({ error: "Only the host can submit results." }, { status: 403 });

  const { data: roster } = await supabase
    .from("tournament_players")
    .select("player_id, team_id, profiles(username, game_id)")
    .eq("tournament_id", tournamentId);
  const players = (roster ?? []).map((r) => {
    const p = r.profiles as unknown as { username: string; game_id: string | null } | null;
    return { id: r.player_id as string, team_id: r.team_id as string | null, username: p?.username ?? "", game_id: p?.game_id ?? null };
  });
  const { data: teams } = await supabase.from("teams").select("id,name").eq("tournament_id", tournamentId);

  const prompt = `You are reading an end-of-match results screenshot from the online kart battle game "Smash Karts".
Extract every player row on the scoreboard: the player name exactly as written, their kills (the main score number), deaths if shown, and their position (1 = top row).
${t.type === "team" ? "This is a TEAM match. For each row give the team colour (e.g. red / blue) and give the colour of the winning team (the team with the higher team score, or the one marked as winner)." : "This is a SOLO (free-for-all) match."}
Registered players expected in this match (names on screen may be slightly different, truncated or stylised): ${players.map((p) => p.username + (p.game_id ? ` (in-game: ${p.game_id})` : "")).join(", ") || "unknown"}.
Do not invent players. If the image is not a results screen, set is_results_screen to false and return an empty players list.`;

  try {
    const { data, model } = await geminiJSON<GeminiOut>({ prompt, image: img, schema });
    if (!data.is_results_screen && !data.players?.length) {
      return NextResponse.json({ error: "That doesn't look like a match results screenshot." }, { status: 422 });
    }
    const found = data.players ?? [];
    const matches = matchNames(
      found.map((f) => f.name),
      players.map((p) => ({ id: p.id, names: [p.username, p.game_id ?? ""] })),
    );
    const rows: AnalyzedRow[] = found.map((f, i) => ({
      name_on_screen: f.name,
      kills: Math.max(0, Math.round(Number(f.kills) || 0)),
      deaths: f.deaths == null ? null : Math.max(0, Math.round(Number(f.deaths) || 0)),
      position: f.position ?? i + 1,
      team_color: f.team_color ?? null,
      player_id: matches[i].id,
      confidence: Math.round(matches[i].score * 100) / 100,
    }));

    // Work out the winning team: colour → our team via the players who wore that colour.
    let winner_team_id: string | null = null;
    if (t.type === "team" && teams?.length) {
      const teamOf = new Map(players.map((p) => [p.id, p.team_id]));
      const color = data.winning_team_color?.toLowerCase().trim();
      if (color) {
        const votes = new Map<string, number>();
        rows.forEach((r) => {
          const tid = r.player_id ? teamOf.get(r.player_id) : null;
          if (tid && r.team_color?.toLowerCase().trim() === color) votes.set(tid, (votes.get(tid) ?? 0) + 1);
        });
        winner_team_id = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        // maybe the team is literally named after the colour
        if (!winner_team_id) winner_team_id = teams.find((tm) => similarity(tm.name, color) > 0.8)?.id ?? null;
      }
      if (!winner_team_id) {
        // fall back to most total kills
        const sums = new Map<string, number>();
        rows.forEach((r) => {
          const tid = r.player_id ? teamOf.get(r.player_id) : null;
          if (tid) sums.set(tid, (sums.get(tid) ?? 0) + r.kills);
        });
        winner_team_id = [...sums.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      }
    }

    const res: AnalyzeResponse = { rows, winner_team_id, notes: data.notes ?? null, model };
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 502 });
  }
}
