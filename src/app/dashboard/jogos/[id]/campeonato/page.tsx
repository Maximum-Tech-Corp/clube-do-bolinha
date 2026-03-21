import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TournamentClient } from "@/components/dashboard/tournament-client";
import { computeStandings, buildGroupMatchOrder } from "@/lib/tournament-utils";
import type { MatchRow } from "@/lib/tournament-utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampeonatoPage({ params }: Props) {
  const { id: gameId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!admin) redirect("/login");

  const { data: team } = await service
    .from("teams")
    .select("id")
    .eq("admin_id", admin.id)
    .single();
  if (!team) redirect("/login");

  const { data: game } = await service
    .from("games")
    .select("id, is_tournament, draw_done, status")
    .eq("id", gameId)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!game) notFound();
  if (!game.draw_done || !game.is_tournament)
    redirect(`/dashboard/jogos/${gameId}`);

  const [{ data: gameTeamsRaw }, { data: matchesRaw }] = await Promise.all([
    service
      .from("game_teams")
      .select("id, team_number")
      .eq("game_id", gameId)
      .order("team_number"),
    service
      .from("tournament_matches")
      .select("*")
      .eq("game_id", gameId)
      .order("match_order"),
  ]);

  const gameTeams = gameTeamsRaw ?? [];
  let matches = (matchesRaw ?? []) as MatchRow[];

  // Gera partidas da fase de grupos se ainda não existem
  // (ocorre quando o modo campeonato é ativado após o sorteio via TournamentToggle)
  if (matches.length === 0 && gameTeams.length >= 4) {
    const ids = gameTeams.map((t) => t.id);
    const pairs = buildGroupMatchOrder(ids);
    const inserts = pairs.map(([home, away], idx) => ({
      game_id: gameId,
      phase: "group" as const,
      home_team_id: home,
      away_team_id: away,
      match_order: idx + 1,
    }));

    const { data: inserted } = await service
      .from("tournament_matches")
      .insert(inserts)
      .select("*");

    matches = (inserted ?? []) as MatchRow[];
  }

  const teamMap = new Map(gameTeams.map((t) => [t.id, t.team_number]));

  const groupMatches = matches.filter((m) => m.phase === "group");
  const standings = computeStandings(groupMatches, teamMap);

  const teamsData = gameTeams.map((t) => ({
    id: t.id,
    teamNumber: t.team_number,
  }));

  const matchesData = matches.map((m) => ({
    id: m.id,
    phase: m.phase,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeScore: m.home_score,
    awayScore: m.away_score,
    matchOrder: m.match_order,
    completed: m.completed,
  }));

  const standingsData = standings.map((s) => ({
    teamId: s.teamId,
    teamNumber: s.teamNumber,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDiff: s.goalDiff,
    points: s.points,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/jogos/${gameId}/times`}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background text-sm font-medium h-9 px-3 hover:bg-muted/50 transition-colors shrink-0"
        >
          ← Times
        </Link>
        <div>
          <h1 className="text-xl font-bold">Campeonato</h1>
          <p className="text-sm text-muted-foreground">
            {gameTeams.length} times
          </p>
        </div>
      </div>

      <TournamentClient
        gameId={gameId}
        nTeams={gameTeams.length}
        teams={teamsData}
        matches={matchesData}
        standings={standingsData}
        isFinished={game.status === "finished"}
      />
    </div>
  );
}
