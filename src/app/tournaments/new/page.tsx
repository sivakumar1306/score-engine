"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { defaultTeams, TournamentBuilder } from "@/components/TournamentBuilder";
import { PageHeader } from "@/components/ui";
import { saveTournament } from "@/lib/tournaments";

export default function NewTournamentPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  return (
    <RequireAuth>
      <PageHeader eyebrow="Host" title="New tournament" subtitle="Set it up, pick the racers, then record results after every match." />
      <TournamentBuilder
        initial={{ name: "", type: "solo", total_matches: 5, soloPlayers: [], teams: defaultTeams() }}
        submitLabel="Create tournament"
        onSubmit={async (v) => {
          const id = await saveTournament(v, user!.id);
          toast("Tournament created — good luck racers!");
          router.push(`/tournaments/${id}`);
        }}
      />
    </RequireAuth>
  );
}
