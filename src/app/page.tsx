"use client";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, Search, Swords, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CountUp } from "@/components/CountUp";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { AnimatedTitle } from "@/components/AnimatedTitle";
import { HeroFX } from "@/components/HeroFX";
import { EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { usePlayerStats } from "@/hooks/usePlayerStats";

export default function HomePage() {
  const { user } = useAuth();
  const { players, error } = usePlayerStats();
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    const list = players ?? [];
    return {
      players: list.length,
      kills: list.reduce((s, p) => s + p.total_kills, 0),
      matches: list.reduce((s, p) => s + p.matches_played, 0),
    };
  }, [players]);

  const rest = useMemo(() => {
    const list = (players ?? []).slice(3);
    if (!q.trim()) return list.map((p, i) => ({ p, rank: i + 4 }));
    return list.map((p, i) => ({ p, rank: i + 4 })).filter(({ p }) => p.username.toLowerCase().includes(q.toLowerCase()));
  }, [players, q]);

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center pb-24 text-center">
        <HeroFX kartUrl={players?.[0]?.kart_url} />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-lime" />
          </span>
          Live leaderboard
        </motion.div>
        <AnimatedTitle />
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="mx-auto mt-6 max-w-2xl text-muted sm:text-xl">
          Host Smash Karts tournaments, drop a screenshot after each match and let AI update the scores. Every kill counts toward the all-time board.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="mt-7 flex flex-wrap justify-center gap-3">
          {user ? (
            <LinkButton href="/tournaments/new" size="lg">
              Host a tournament <ArrowRight className="size-4" />
            </LinkButton>
          ) : (
            <LinkButton href="/signup" size="lg">
              Join the grid <ArrowRight className="size-4" />
            </LinkButton>
          )}
          <LinkButton href="/tournaments" variant="outline" size="lg">
            <Trophy className="size-4" /> Tournaments
          </LinkButton>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mx-auto mt-12 grid w-full max-w-4xl grid-cols-3 gap-3 sm:gap-5">
          {[
            { icon: Users, label: "Racers", value: totals.players },
            { icon: Crosshair, label: "Total kills", value: totals.kills },
            { icon: Swords, label: "Player matches", value: totals.matches },
          ].map((s) => (
            <motion.div key={s.label} whileHover={{ y: -4, scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="glass glow-border rounded-2xl px-3 py-4">
              <s.icon className="mx-auto mb-1.5 size-4 text-hot" />
              <div className="font-display text-2xl font-bold sm:text-5xl">{players ? <CountUp value={s.value} /> : "—"}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {error && <div className="glass rounded-xl p-4 text-sm text-hot">Couldn&apos;t load the leaderboard: {error}</div>}

      {/* Podium */}
      <section>
        <SectionTitle title="Top killers" subtitle="All-time kills across solo and team matches" />
        {!players ? (
          <div className="grid grid-cols-3 items-end gap-4">
            <Skeleton className="h-60" />
            <Skeleton className="h-72" />
            <Skeleton className="h-52" />
          </div>
        ) : players.length === 0 ? (
          <EmptyState icon={<Trophy className="size-6" />} title="No racers yet" text="Sign up, add your kart and host the first tournament." action={<LinkButton href="/signup">Sign up</LinkButton>} />
        ) : (
          <div className="mx-auto max-w-5xl">
            <Podium top={players.slice(0, 3)} />
          </div>
        )}
      </section>

      {/* Rest */}
      {players && players.length > 3 && (
        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle title="The grid" subtitle="Everyone else, ranked by kills" noMargin />
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {rest.length ? (
            <LeaderboardTable players={rest.map((r) => r.p)} ranks={rest.map((r) => r.rank)} />
          ) : (
            <p className="text-center text-sm text-muted">No players match “{q}”.</p>
          )}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle, noMargin }: { title: string; subtitle?: string; noMargin?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={noMargin ? "" : "mb-8 text-center"}>
      <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </motion.div>
  );
}
