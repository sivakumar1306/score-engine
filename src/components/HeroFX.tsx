"use client";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/** Hero backdrop: mouse spotlight, racing speed lines, rising sparks and a kart zooming across. */
export function HeroFX({ kartUrl }: { kartUrl?: string | null }) {
  const mx = useMotionValue(50);
  const my = useMotionValue(40);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const bg = useMotionTemplate`radial-gradient(900px circle at ${sx}% ${sy}%, rgb(255 61 113 / 0.16), transparent 60%)`;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const move = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 100);
      my.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [mx, my]);

  const lines = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ top: 8 + ((i * 53) % 84), w: 80 + ((i * 37) % 220), d: 1.1 + ((i * 7) % 10) / 6, delay: (i * 0.37) % 3, hot: i % 3 === 0 })),
    [],
  );
  const sparks = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({ left: (i * 41) % 100, size: 2 + (i % 3), d: 5 + (i % 6), delay: (i * 0.53) % 6, c: ["#ff3d71", "#ffb800", "#3dc9ff"][i % 3] })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-6rem] bottom-0 -z-10 w-screen -translate-x-1/2 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
      <motion.div className="absolute inset-0" style={{ background: bg }} />
      {mounted &&
        lines.map((l, i) => (
          <span
            key={i}
            className="absolute h-px rounded-full"
            style={{
              top: `${l.top}%`,
              width: l.w,
              left: "-20%",
              background: `linear-gradient(90deg, transparent, ${l.hot ? "rgb(255 61 113 / 0.7)" : "rgb(255 255 255 / 0.25)"})`,
              animation: `speedline ${l.d}s linear ${l.delay}s infinite`,
            }}
          />
        ))}
      {mounted &&
        sparks.map((s, i) => (
          <span
            key={`s${i}`}
            className="absolute bottom-0 rounded-full"
            style={{ left: `${s.left}%`, width: s.size, height: s.size, background: s.c, boxShadow: `0 0 8px ${s.c}`, animation: `spark ${s.d}s ease-in ${s.delay}s infinite` }}
          />
        ))}
      {mounted && (
        <div className="absolute bottom-[4.5rem] left-0 w-full" style={{ animation: "kartdrive 9s cubic-bezier(.45,.05,.55,.95) 1.2s infinite" }}>
          <div className="relative w-24 sm:w-32">
            <div className="absolute right-full top-1/2 h-3 w-40 -translate-y-1/2 rounded-full bg-gradient-to-l from-hot/60 via-amber/30 to-transparent blur-sm" />
            {kartUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kartUrl} alt="" className="w-full -scale-x-100 drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)]" style={{ animation: "bounce-kart 0.35s ease-in-out infinite" }} />
            ) : (
              <svg viewBox="0 0 300 200" className="w-full" style={{ animation: "bounce-kart 0.35s ease-in-out infinite" }}>
                <rect x="30" y="90" width="240" height="60" rx="20" fill="#ff3d71" />
                <rect x="90" y="60" width="110" height="40" rx="12" fill="#c2185b" />
                <circle cx="145" cy="45" r="28" fill="#ffd36b" />
                <circle cx="75" cy="155" r="30" fill="#111" /><circle cx="225" cy="155" r="30" fill="#111" />
                <circle cx="75" cy="155" r="12" fill="#999" /><circle cx="225" cy="155" r="12" fill="#999" />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
