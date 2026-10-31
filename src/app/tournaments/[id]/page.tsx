"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, Crown, Crosshair, Image as ImageIcon, Lock, Pencil, Play, Plus, RotateCcw, Trash2, Trophy, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { KartAvatar } from "@/components/KartAvatar";
import { MatchResultModal } from "@/components/MatchResultModal";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { Badge, Button, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { useStandings, useTournament, type TournamentData } from "@/hooks/useTournament";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { data, notFound, reload } = useTournament(id);
  const standings = useStandings(data);
  const [openMatch, setOpenMatch] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (notFound) return <EmptyState icon={<Lock className="size-6" />} title="Tournament not found" action={<LinkButton href="/tournaments">All tournaments</LinkButton>} />;
  if (!data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-72" />
      </div>
    );

  const t = data.tournament;
  const isHost = user?.id === t.host_id;
  const played = data.matches.length;
  const nextMatch = Array.from({ length: t.total_matches }, (_, i) => i + 1).find((n) => !data.matches.some((m) => m.match_number === n));
  const leader = t.type === "solo" ? standings.solo[0] : null;
  const leadTeam = t.type === "team" ? standings.teams[0] : null;

  const setStatus = async (status: "upcoming" | "live" | "completed") => {
    setBusy(true);
    const { error } = await getSupabase().from("tournaments").update({ status }).eq("id", t.id);
    setBusy(false);
    if (error) return toast(error.message, "error");
    reload();
  };
  const remove = async () => {
    if (!confirm(`Delete “${t.name}”? Its matches and kills will be removed from the leaderboard.`)) return;
    setBusy(true);
    const { error } = await getSupabase().from("tournaments").delete().eq("id", t.id);
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Tournament deleted", "info");
    router.push("/tournaments");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-hot/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-72 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge color={t.type === "solo" ? "hot" : "cyan"}>{t.type === "solo" ? <User className="size-3" /> : <Users className="size-3" />} {t.type === "solo" ? "Solo · ranked by kills" : "Team · ranked by wins"}</Badge>
              <StatusBadge status={t.status} />
            </div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{t.name}</h1>
            <p className="mt-1 text-sm text-muted">
              Hosted by{" "}
              {data.host ? <Link className="text-ink hover:text-hot" href={`/players/${encodeURIComponent(data.host.username)}`}>{data.host.username}</Link> : "unknown"} · {data.roster.length} racers
            </p>
            <div className="mt-5 max-w-sm">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Progress</span>
                <span>{played}/{t.total_matches} matches</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-hot),var(--color-amber))]" initial={{ width: 0 }} animate={{ width: `${(played / t.total_matches) * 100}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          </div>
          {isHost && (
            <div className="flex flex-wrap gap-2">
              {nextMatch && (
                <Button onClick={() => setOpenMatch(nextMatch)}>
                  <Plus className="size-4" /> Record match {nextMatch}
                </Button>
              )}
              <LinkButton href={`/tournaments/${t.id}/edit`} variant="outline"><Pencil className="size-4" /> Edit</LinkButton>
              {t.status === "upcoming" && <Button variant="outline" onClick={() => setStatus("live")} loading={busy}><Play className="size-4" /> Go live</Button>}
              {t.status === "live" && <Button variant="outline" onClick={() => setStatus("completed")} loading={busy}><CheckCircle2 className="size-4" /> End</Button>}
              {t.status === "completed" && <Button variant="outline" onClick={() => setStatus("live")} loading={busy}><RotateCcw className="size-4" /> Reopen</Button>}
              <Button variant="ghost" className="text-hot" onClick={remove} disabled={busy} aria-label="Delete"><Trash2 className="size-4" /></Button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Champion / leader */}
      {played > 0 && (leader || leadTeam) && (
        <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="relative overflow-hidden rounded-3xl border border-gold/30 bg-[linear-gradient(120deg,rgb(255_213_74/0.14),rgb(255_61_113/0.08)_60%,transparent)] p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {leader ? (
              <KartAvatar url={leader.player.kart_url} name={leader.player.username} size={72} glow="rgb(255 213 74 / 0.6)" className="animate-float" />
            ) : (
              <div className="grid size-16 place-items-center rounded-2xl" style={{ background: `${leadTeam!.team.color}33` }}>
                <Users className="size-8" style={{ color: leadTeam!.team.color }} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold">
                <Crown className="size-4 fill-gold" /> {t.status === "completed" ? "Champion" : "Leading"}
              </div>
              <div className="font-display text-2xl font-bold">{leader ? leader.player.username : leadTeam!.team.name}</div>
              <div className="text-sm text-muted">{leader ? `${leader.kills} kills` : `${leadTeam!.wins} wins · ${leadTeam!.kills} kills`}</div>
            </div>
          </div>
        </motion.section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Standings */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Standings</h2>
          {t.type === "solo" ? <SoloTable data={data} standings={standings.solo} /> : <TeamStandings standings={standings.teams} />}
        </section>

        {/* Matches */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Matches</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
            {Array.from({ length: t.total_matches }, (_, i) => i + 1).map((n, i) => {
              const m = data.matches.find((x) => x.match_number === n);
              const results = m ? data.results.filter((r) => r.match_id === m.id) : [];
              const top = results.sort((a, b) => b.kills - a.kills)[0];
              const topName = top ? data.roster.find((p) => p.id === top.player_id)?.username : null;
              const win = m?.winner_team_id ? data.teams.find((x) => x.id === m.winner_team_id) : null;
              const clickable = !!m || isHost;
              return (
                <motion.button
                  key={n}
                  type="button"
                  disabled={!clickable}
                  onClick={() => setOpenMatch(n)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.03 }}
                  whileHover={clickable ? { y: -3 } : undefined}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-default",
                    m ? "glass hover:border-white/20" : n === nextMatch && isHost ? "border-dashed border-hot/50 bg-hot/5 hover:bg-hot/10" : "border-dashed border-line",
                  )}
                >
                  {win && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: win.color }} />}
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-muted">M{n}</span>
                    <span className="flex items-center gap-1 text-muted">
                      {m?.entry_method === "ai" && <Bot className="size-3.5 text-cyan" />}
                      {m?.screenshot_url && <ImageIcon className="size-3.5" />}
                    </span>
                  </div>
                  {m ? (
                    <div className="mt-2">
                      {win ? (
                        <div className="flex items-center gap-1.5 truncate text-sm font-semibold"><Crown className="size-3.5 shrink-0 text-gold" /> <span className="truncate">{win.name}</span></div>
                      ) : (
                        <div className="truncate text-sm font-semibold">{topName ?? "—"}</div>
                      )}
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted"><Crosshair className="size-3" /> {results.reduce((s, r) => s + r.kills, 0)} kills</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted">{isHost && n === nextMatch ? <span className="flex items-center gap-1 text-hot"><Plus className="size-3.5" /> Record</span> : "Not played"}</div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {openMatch !== null && (
          <MatchResultModal
            key={openMatch}
            data={data}
            matchNumber={openMatch}
            canEdit={isHost}
            userId={user?.id ?? null}
            onClose={() => setOpenMatch(null)}
            onSaved={(msg) => {
              setOpenMatch(null);
              toast(msg);
              reload();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SoloTable({ data, standings }: { data: TournamentData; standings: ReturnType<typeof useStandings>["solo"] }) {
  const n = data.tournament.total_matches;
  const showCols = n <= 10;
  if (!standings.length) return <EmptyState icon={<Users className="size-6" />} title="No players yet" />;
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-2 py-3 text-left font-semibold">Player</th>
            {showCols && Array.from({ length: n }, (_, i) => <th key={i} className="px-2 py-3 text-center font-semibold">M{i + 1}</th>)}
            <th className="px-4 py-3 text-right font-semibold">Kills</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <motion.tr key={s.player.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-line/60 last:border-0 hover:bg-white/[0.03]">
              <td className="px-4 py-2.5">
                <span className={cn("font-display text-base font-bold", i === 0 ? "text-gold" : i === 1 ? "text-silver" : i === 2 ? "text-bronze" : "text-muted")}>{i + 1}</span>
              </td>
              <td className="px-2 py-2.5">
                <Link href={`/players/${encodeURIComponent(s.player.username)}`} className="flex items-center gap-2.5 hover:text-hot">
                  <KartAvatar url={s.player.kart_url} name={s.player.username} size={32} className="rounded-lg" />
                  <span className="font-medium">{s.player.username}</span>
                </Link>
              </td>
              {showCols && Array.from({ length: n }, (_, k) => (
                <td key={k} className="px-2 py-2.5 text-center text-muted">{s.perMatch[k + 1] ?? "·"}</td>
              ))}
              <td className="px-4 py-2.5 text-right font-display text-lg font-bold">{s.kills}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamStandings({ standings }: { standings: ReturnType<typeof useStandings>["teams"] }) {
  if (!standings.length) return <EmptyState icon={<Users className="size-6" />} title="No teams yet" />;
  return (
    <div className="space-y-3">
      {standings.map((s, i) => (
        <motion.div key={s.team.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass relative overflow-hidden rounded-2xl p-4">
          <div className="absolute inset-y-0 left-0 w-1" style={{ background: s.team.color }} />
          <div className="flex items-center gap-3">
            <span className={cn("font-display text-2xl font-bold", i === 0 ? "text-gold" : "text-muted")}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                {s.team.name} {i === 0 && s.wins > 0 && <Trophy className="size-4 text-gold" />}
              </div>
              <div className="text-xs text-muted">{s.kills} kills</div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold" style={{ color: s.team.color }}>{s.wins}</div>
              <div className="text-xs text-muted">wins</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.players.sort((a, b) => b.kills - a.kills).map(({ player, kills }) => (
              <Link key={player.id} href={`/players/${encodeURIComponent(player.username)}`} className="flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] py-1 pl-1 pr-2.5 text-xs transition hover:bg-white/[0.07]">
                <KartAvatar url={player.kart_url} name={player.username} size={22} className="rounded-md" />
                <span className="font-medium">{player.username}</span>
                <span className="text-muted">{kills}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
