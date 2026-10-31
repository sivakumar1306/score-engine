"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(100deg,var(--color-hot),#ff6a4d_55%,var(--color-amber))] shadow-[0_10px_30px_-10px_rgb(255_61_113/0.7)] hover:shadow-[0_14px_40px_-10px_rgb(255_61_113/0.9)]",
  ghost: "text-ink/85 hover:text-ink hover:bg-white/[0.06]",
  outline: "text-ink border border-line bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20",
  danger: "text-white bg-red-500/90 hover:bg-red-500",
};

type ButtonProps = HTMLMotionProps<"button"> & { variant?: Variant; loading?: boolean; size?: "sm" | "md" | "lg" };

export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-[box-shadow,background,color,border-color] duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4.5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-base",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children as ReactNode}
    </motion.button>
  );
}

export function LinkButton({ href, variant = "primary", className, children, size = "md" }: { href: string; variant?: Variant; className?: string; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-px active:scale-[0.97]",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4.5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-base",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={cn("glass rounded-2xl", className)} {...rest}>
      {children}
    </motion.div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink/90">{label}</span>
      {children}
      {error ? <span className="block text-xs text-hot">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, color = "default", className }: { children: ReactNode; color?: "default" | "hot" | "cyan" | "lime" | "amber"; className?: string }) {
  const c = {
    default: "bg-white/[0.06] text-ink/80 border-line",
    hot: "bg-hot/15 text-hot border-hot/30",
    cyan: "bg-cyan/12 text-cyan border-cyan/30",
    lime: "bg-lime/12 text-lime border-lime/30",
    amber: "bg-amber/12 text-amber border-amber/30",
  }[color];
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", c, className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-hot">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/[0.05] text-muted">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer", value === o.value ? "text-white" : "text-muted hover:text-ink")}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-lg bg-[linear-gradient(100deg,var(--color-hot),var(--color-amber))]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-2">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
