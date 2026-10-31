"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { TournamentBuilder } from "@/components/TournamentBuilder";
import { EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { useTournament } from "@/hooks/useTournament";
import { saveTournament } from "@/lib/tournaments";
import { Lock } from "lucide-react";

export default function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data, notFound } = useTournament(id);

  return (
    <RequireAuth>
      {notFound ? (
        <EmptyState icon={<Lock className="size-6" />} title="Tournament not found" />
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.tournament.host_id !== user?.id ? (
        <EmptyState icon={<Lock className="size-6" />} title="Only the host can edit this tournament" action={<LinkButton href={`/tournaments/${id}`}>Back</LinkButton>} />
      ) : (
        <>
          <PageHeader eyebrow="Edit" title={data.tournament.name} />
          <TournamentBuilder
            lockType
            minMatches={Math.max(1, ...data.matches.map((m) => m.match_number))}
            initial={{
              name: data.tournament.name,
              type: data.tournament.type,
              total_matches: data.tournament.total_matches,
              soloPlayers: data.roster.map((p) => p.id),
              teams: data.teams.map((t) => ({ key: t.id, id: t.id, name: t.name, color: t.color, players: data.roster.filter((p) => p.team_id === t.id).map((p) => p.id) })),
            }}
            submitLabel="Save changes"
            onSubmit={async (v) => {
              await saveTournament(v, user!.id, id);
              toast("Tournament updated");
              router.push(`/tournaments/${id}`);
            }}
          />
        </>
      )}
    </RequireAuth>
  );
}
