import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TeamsClient } from "@/components/dashboard/teams-client";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TimesPage({ params }: Props) {
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
    .select("id, location, scheduled_at, status, is_tournament, draw_done")
    .eq("id", gameId)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!game) notFound();
  if (!game.draw_done) redirect(`/dashboard/jogos/${gameId}`);

  // Busca times ordenados
  const { data: gameTeams } = await service
    .from("game_teams")
    .select("id, team_number")
    .eq("game_id", gameId)
    .order("team_number");

  const teamIds = (gameTeams ?? []).map((t) => t.id);

  // Busca jogadores de cada time com stats
  const [teamPlayersResult, tournamentResult] = await Promise.all([
    teamIds.length > 0
      ? service
          .from("game_team_players")
          .select("id, game_team_id, player_id, goals, assists")
          .in("game_team_id", teamIds)
      : Promise.resolve({ data: [] }),

    // Verifica se campeonato está completo (para habilitar "Finalizar")
    game.is_tournament
      ? Promise.all([
          service
            .from("tournament_matches")
            .select("*", { count: "exact", head: true })
            .eq("game_id", gameId),
          service
            .from("tournament_matches")
            .select("*", { count: "exact", head: true })
            .eq("game_id", gameId)
            .eq("completed", true),
        ])
      : Promise.resolve(null),
  ]);

  const teamPlayers = teamPlayersResult.data ?? [];
  const playerIds = teamPlayers.map((tp) => tp.player_id);

  const { data: players } = playerIds.length > 0
    ? await service
        .from("players")
        .select("id, name, is_star")
        .in("id", playerIds)
    : { data: [] };

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));

  // Verifica se campeonato está completo
  let tournamentCompleted = false;
  if (game.is_tournament && Array.isArray(tournamentResult)) {
    const [totalResult, completedResult] = tournamentResult;
    const total = totalResult.count ?? 0;
    const completed = completedResult.count ?? 0;
    tournamentCompleted = total > 0 && completed === total;
  }

  // Monta estrutura de times para o cliente
  const teamsData = (gameTeams ?? []).map((gt) => ({
    id: gt.id,
    teamNumber: gt.team_number,
    players: teamPlayers
      .filter((tp) => tp.game_team_id === gt.id)
      .map((tp) => {
        const player = playerMap.get(tp.player_id);
        return {
          gameTeamPlayerId: tp.id,
          playerId: tp.player_id,
          name: player?.name ?? "—",
          isStar: player?.is_star ?? false,
          goals: tp.goals,
          assists: tp.assists,
        };
      }),
  }));

  const isFinished = game.status === "finished";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Times</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(game.scheduled_at)}
            {game.location ? ` · ${game.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game.is_tournament && (
            <Badge variant="secondary">Campeonato</Badge>
          )}
          {isFinished && <Badge variant="outline">Finalizado</Badge>}
        </div>
      </div>

      {/* Botão para campeonato */}
      {game.is_tournament && (
        <Link
          href={`/dashboard/jogos/${gameId}/campeonato`}
          className="inline-flex w-full items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium h-9 hover:bg-primary/10 transition-colors"
        >
          Ver campeonato
        </Link>
      )}

      <TeamsClient
        gameId={gameId}
        teams={teamsData}
        isFinished={isFinished}
        isTournament={game.is_tournament}
        tournamentCompleted={tournamentCompleted}
      />

    </div>
  );
}
