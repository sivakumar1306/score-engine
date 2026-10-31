"use client";
import { cn, initials } from "@/lib/utils";

/** Shows the player's kart (transparent PNG) or a gradient monogram fallback. */
export function KartAvatar({ url, name, size = 48, className, glow }: { url?: string | null; name: string; size?: number; className?: string; glow?: string }) {
  if (url) {
    return (
      <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
        {glow && <div className="absolute inset-[15%] rounded-full blur-xl opacity-60" style={{ background: glow }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${name}'s kart`} className="relative size-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)]" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hash(name) % 360} 85% 55%), hsl(${(hash(name) + 60) % 360} 85% 45%))`,
      }}
    >
      {initials(name)}
    </div>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
