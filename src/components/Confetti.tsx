"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";

/** One-shot burst of confetti, used above the champion. */
export function Confetti({ delay = 1 }: { delay?: number }) {
  const bits = useMemo(
    () => Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = 70 + ((i * 29) % 70);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r - 40, rot: (i * 47) % 360, c: ["#ffd54a", "#ff3d71", "#3dc9ff", "#7cff6b", "#ffb800"][i % 5], w: i % 2 ? 6 : 4 };
    }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 z-10">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: b.w, height: b.w * 1.8, background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 120], opacity: [1, 1, 0], rotate: b.rot + 360, scale: 1 }}
          transition={{ delay, duration: 1.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
