"use client";
import { motion } from "framer-motion";
import { Calendar, Plus, Trophy, User, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Badge, EmptyState, LinkButton, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tournament } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type Row = Tournament & { host: { username: string } | null; matches: { count: number }[]; tournament_players: { count: number }[] };
type Filter = "all" | "live" | "upcoming" | "completed" | "mine";

export default function TournamentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!isSupabaseConfigured) return setRows([]);
    getSupabase()
      .from("tournaments")
      .select("*, host:profiles!tournaments_host_id_fkey(username), matches(count), tournament_players(count)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  const list = useMemo(() => {
    if (!rows) return null;
    if (filter === "all") return rows;
    if (filter === "mine") return rows.filter((r) => r.host_id === user?.id);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter, user]);

  return (
    <div>
      <PageHeader
        eyebrow="Compete"
        title="Tournaments"
        subtitle="Solo battles ranked by kills, team battles ranked by wins."
        action={user && <LinkButton href="/tournaments/new"><Plus className="size-4" /> Host tournament</LinkButton>}
      />
      <div className="mb-6 overflow-x-auto">
        <Segmented
          id="tfilter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
            ...(user ? [{ value: "mine" as const, label: "Hosted by me" }] : []),
          ]}
        />
      </div>

      {!list ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Trophy className="size-6" />} title="No tournaments here yet" text="Host one and invite your crew." action={user ? <LinkButton href="/tournaments/new">Host tournament</LinkButton> : <LinkButton href="/signup">Sign up to host</LinkButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => {
            const played = t.matches?.[0]?.count ?? 0;
            const pct = Math.min(100, (played / t.total_matches) * 100);
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
                <Link href={`/tournaments/${t.id}`} className="glass group relative block overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_20px_50px_-20px_rgb(255_61_113/0.45)]">
                  <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-hot/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
                  <div className="mb-4 flex items-center justify-between">
                    <Badge color={t.type === "solo" ? "hot" : "cyan"}>{t.type === "solo" ? <User className="size-3" /> : <Users className="size-3" />} {t.type === "solo" ? "Solo" : "Team"}</Badge>
                    <StatusBadge status={t.status} />
                  </div>
                  <h3 className="truncate font-display text-xl font-bold">{t.name}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>by {t.host?.username ?? "unknown"}</span>
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-muted">
                    <span>{t.tournament_players?.[0]?.count ?? 0} racers</span>
                    <span>{played}/{t.total_matches} matches</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-hot),var(--color-amber))]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.04, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
