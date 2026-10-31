import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { geminiJSON, parseDataUrl } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = {
  type: "OBJECT",
  properties: {
    found: { type: "BOOLEAN" },
    box_2d: {
      type: "ARRAY",
      items: { type: "INTEGER" },
      description: "[ymin, xmin, ymax, xmax] normalised to 0-1000",
    },
    label: { type: "STRING", nullable: true },
  },
  required: ["found", "box_2d"],
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { image } = (await req.json().catch(() => ({}))) as { image?: string };
  const img = image ? parseDataUrl(image) : null;
  if (!img) return NextResponse.json({ error: "Missing image." }, { status: 400 });
  if (img.base64.length > 6_000_000) return NextResponse.json({ error: "Image too large." }, { status: 413 });

  const prompt = `This is a screenshot from the game "Smash Karts" showing a player's kart.
Detect the single main kart (the vehicle together with its driver character, including wheels and any accessories).
Return a tight bounding box as box_2d = [ymin, xmin, ymax, xmax] normalised to 0-1000. Ignore UI, text, menus and background scenery.
If there is no kart, set found to false.`;

  try {
    const { data, model } = await geminiJSON<{ found: boolean; box_2d: number[]; label?: string }>({ prompt, image: img, schema });
    const b = data.box_2d;
    if (!data.found || !Array.isArray(b) || b.length !== 4 || b[2] <= b[0] || b[3] <= b[1]) {
      return NextResponse.json({ error: "Couldn't find a kart in that image. Try a clearer screenshot." }, { status: 422 });
    }
    return NextResponse.json({ box: b, model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 502 });
  }
}
