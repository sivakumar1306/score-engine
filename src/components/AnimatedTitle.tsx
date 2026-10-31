"use client";
import { motion } from "framer-motion";

/** Hero headline: words drop in letter by letter, the last word gets a moving gradient shine. */
export function AnimatedTitle() {
  const words = ["Smash.", "Drift.", "Dominate."];
  let n = 0;
  return (
    <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl" aria-label={words.join(" ")}>
      {words.map((w, wi) => (
        <span key={w} className="mr-[0.25em] inline-block whitespace-nowrap last:mr-0">
          {w.split("").map((ch) => {
            const i = n++;
            return (
              <motion.span
                key={i}
                aria-hidden
                className={wi === 2 ? "shine-text inline-block" : "inline-block"}
                initial={{ opacity: 0, y: 40, rotateX: -90, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.15 + i * 0.035 + wi * 0.12, type: "spring", stiffness: 260, damping: 18 }}
                whileHover={{ y: -8, scale: 1.15, transition: { type: "spring", stiffness: 500, damping: 10 } }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
