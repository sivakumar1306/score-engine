import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { geminiJSON, parseDataUrl } from "@/lib/gemini";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const num = { type: "INTEGER", nullable: true };
const schema = {
  type: "OBJECT",
  properties: {
    is_profile_screen: { type: "BOOLEAN" },
    name: { type: "STRING", nullable: true, description: "player name next to the level badge" },
    level: num,
    xp: { type: "STRING", nullable: true, description: "XP exactly as shown, e.g. 38591 / 44000" },
    region: { type: "STRING", nullable: true },
    kills: num,
    revenge_kills: num,
    bot_kills: num,
    deaths: num,
    kdr: { type: "NUMBER", nullable: true },
    wins: num,
    games: num,
    skid: { type: "STRING", nullable: true, description: "text after 'SKID:' copied character by character" },
    kart_found: { type: "BOOLEAN" },
    kart_box: { type: "ARRAY", items: { type: "INTEGER" }, description: "[ymin, xmin, ymax, xmax] 0-1000 around the kart and its driver" },
  },
  required: ["is_profile_screen", "kart_found", "kart_box"],
};

export type ReadProfileResult = {
  name: string | null; level: number | null; xp: string | null; region: string | null;
  kills: number | null; revenge_kills: number | null; bot_kills: number | null; deaths: number | null;
  kdr: number | null; wins: number | null; games: number | null; skid: string | null;
  kart_box: [number, number, number, number] | null;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { image } = (await req.json().catch(() => ({}))) as { image?: string };
  const img = image ? parseDataUrl(image) : null;
  if (!img) return NextResponse.json({ error: "Missing image." }, { status: 400 });
  if (img.base64.length > 6_000_000) return NextResponse.json({ error: "Image too large." }, { status: 413 });

  const prompt = `This is a screenshot of a player's profile screen in the game "Smash Karts".
It shows a level badge with the player name, then rows: XP, Region, Kills, Revenge Kills, Bot Kills, Deaths, KDR, Wins, Games, and at the bottom "SKID: <id>". The player's kart with its driver character is shown on the right.
Read every value exactly. Numbers must be plain numbers. Copy the SKID exactly (it is case-sensitive; be careful with I/l/1 and O/0).
Also return kart_box: a tight bounding box [ymin, xmin, ymax, xmax] normalised 0-1000 around the kart and driver (exclude the stats panel and buttons).
If a field is not visible, return null. If this is not a Smash Karts profile screen, set is_profile_screen false.`;

  try {
    const { data } = await geminiJSON<Record<string, unknown>>({ prompt, image: img, schema });
    if (!data.is_profile_screen) {
      return NextResponse.json({ error: "That doesn't look like a Smash Karts profile screen." }, { status: 422 });
    }
    const int = (v: unknown) => (v == null || v === "" || isNaN(Number(v)) ? null : Math.round(Number(v)));
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const box = data.kart_box as number[] | undefined;
    const validBox = data.kart_found && Array.isArray(box) && box.length === 4 && box[2] > box[0] && box[3] > box[1];
    const out: ReadProfileResult = {
      name: str(data.name),
      level: int(data.level),
      xp: str(data.xp),
      region: str(data.region),
      kills: int(data.kills),
      revenge_kills: int(data.revenge_kills),
      bot_kills: int(data.bot_kills),
      deaths: int(data.deaths),
      kdr: data.kdr == null || isNaN(Number(data.kdr)) ? null : Number(data.kdr),
      wins: int(data.wins),
      games: int(data.games),
      skid: str(data.skid)?.replace(/^SKID:\s*/i, "") ?? null,
      kart_box: validBox ? (box as [number, number, number, number]) : null,
    };

    // Save straight from the AI reading — players can't edit these values.
    const { data: me } = await supabase.from("profiles").select("game_id").eq("id", auth.user.id).single();
    const update: Record<string, unknown> = {
      sk_name: out.name, sk_id: out.skid, sk_level: out.level, sk_xp: out.xp, sk_region: out.region,
      sk_kills: out.kills, sk_revenge_kills: out.revenge_kills, sk_bot_kills: out.bot_kills, sk_deaths: out.deaths,
      sk_kdr: out.kdr, sk_wins: out.wins, sk_games: out.games, sk_updated_at: new Date().toISOString(),
    };
    if (!me?.game_id && out.name) update.game_id = out.name;
    const { error: saveErr } = await getAdminSupabase().from("profiles").update(update).eq("id", auth.user.id);
    if (saveErr) throw new Error(saveErr.message);

    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 502 });
  }
}
