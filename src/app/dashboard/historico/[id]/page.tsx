import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { computeStandings } from "@/lib/tournament-utils";
import type { MatchRow } from "@/lib/tournament-utils";
import type { TournamentPhase } from "@/types/database.types";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const phaseLabel: Record<TournamentPhase, string> = {
  group: "Fase de Grupos",
  semi: "Semifinais",
  final: "Final",
};

export default async function HistoricoDetailPage({ params }: Props) {
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
    .select("id, location, scheduled_at, status, is_tournament, finished_at")
    .eq("id", gameId)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!game) notFound();
  if (game.status !== "finished") redirect(`/dashboard/jogos/${gameId}`);

  // Busca times e partidas em paralelo
  const [{ data: gameTeamsRaw }, { data: matchesRaw }] = await Promise.all([
    service
      .from("game_teams")
      .select("id, team_number")
      .eq("game_id", gameId)
      .order("team_number"),
    game.is_tournament
      ? service
          .from("tournament_matches")
          .select("*")
          .eq("game_id", gameId)
          .order("match_order")
      : Promise.resolve({ data: [] }),
  ]);

  const gameTeams = gameTeamsRaw ?? [];
  const teamIds = gameTeams.map((t) => t.id);

  // Busca players de cada time e seus stats
  const { data: gtpRaw } = teamIds.length > 0
    ? await service
        .from("game_team_players")
        .select("id, game_team_id, player_id, goals, assists")
        .in("game_team_id", teamIds)
    : { data: [] };

  const gtp = gtpRaw ?? [];
  const playerIds = gtp.map((p) => p.player_id);

  const { data: playersRaw } = playerIds.length > 0
    ? await service
        .from("players")
        .select("id, name, is_star")
        .in("id", playerIds)
    : { data: [] };

  const playerMap = new Map((playersRaw ?? []).map((p) => [p.id, p]));
  const teamMap = new Map(gameTeams.map((t) => [t.id, t.team_number]));

  // Monta dados dos times
  const teamsData = gameTeams.map((gt) => ({
    teamNumber: gt.team_number,
    players: gtp
      .filter((p) => p.game_team_id === gt.id)
      .map((p) => {
        const player = playerMap.get(p.player_id);
        return {
          name: player?.name ?? "—",
          isStar: player?.is_star ?? false,
          goals: p.goals,
          assists: p.assists,
        };
      })
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists),
  }));

  // Destaques do jogo
  const allPlayers = gtp.map((p) => {
    const player = playerMap.get(p.player_id);
    return { name: player?.name ?? "—", goals: p.goals, assists: p.assists };
  });

  const withGoals = allPlayers.filter((p) => p.goals > 0);
  const withAssists = allPlayers.filter((p) => p.assists > 0);
  const withContrib = allPlayers.filter((p) => p.goals + p.assists > 0);

  const topScorer =
    withGoals.length > 0
      ? withGoals.reduce((best, p) =>
          p.goals > best.goals || (p.goals === best.goals && p.assists > best.assists)
            ? p
            : best
        )
      : null;

  const topAssister =
    withAssists.length > 0
      ? withAssists.reduce((best, p) =>
          p.assists > best.assists || (p.assists === best.assists && p.goals > best.goals)
            ? p
            : best
        )
      : null;

  // MVP = maior contribuição total (gols + assists), desempate por gols
  const mvp =
    withContrib.length > 0
      ? withContrib.reduce((best, p) => {
          const bTotal = best.goals + best.assists;
          const pTotal = p.goals + p.assists;
          return pTotal > bTotal || (pTotal === bTotal && p.goals > best.goals)
            ? p
            : best;
        })
      : null;

  // Dados do campeonato
  const matches = (matchesRaw ?? []) as MatchRow[];
  const groupMatches = matches.filter((m) => m.phase === "group");
  const standings = game.is_tournament
    ? computeStandings(groupMatches, teamMap)
    : [];

  const matchesByPhase = (["group", "semi", "final"] as TournamentPhase[])
    .map((phase) => ({
      phase,
      matches: matches.filter((m) => m.phase === phase),
    }))
    .filter(({ matches: ms }) => ms.length > 0);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold leading-tight">
            {formatDate(game.scheduled_at)}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {game.is_tournament && (
              <Badge variant="secondary">Campeonato</Badge>
            )}
            <Badge variant="outline">Finalizado</Badge>
          </div>
        </div>
        {game.location && (
          <p className="text-sm text-muted-foreground">{game.location}</p>
        )}
      </div>

      {/* Destaques */}
      {(mvp || topScorer || topAssister) && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {mvp && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">MVP</span>
              <span className="font-semibold">
                {mvp.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {mvp.goals}G · {mvp.assists}A
                </span>
              </span>
            </div>
          )}
          {topScorer && topScorer.name !== mvp?.name && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Artilheiro</span>
              <span className="font-semibold">
                {topScorer.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {topScorer.goals}G
                </span>
              </span>
            </div>
          )}
          {topAssister && topAssister.name !== mvp?.name && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Assistências</span>
              <span className="font-semibold">
                {topAssister.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {topAssister.assists}A
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Times e stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Times
        </h2>
        {teamsData.map((team) => {
          const totalGoals = team.players.reduce((s, p) => s + p.goals, 0);
          return (
            <div
              key={team.teamNumber}
              className="rounded-lg border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                <h3 className="font-semibold text-sm">Time {team.teamNumber}</h3>
                <span className="text-xs text-muted-foreground">
                  {totalGoals} gol{totalGoals !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {team.players.map((player, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium">
                      {player.isStar && <span className="mr-1">⭐</span>}
                      {player.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {player.goals}G · {player.assists}A
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Campeonato */}
      {game.is_tournament && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Campeonato
          </h2>

          {/* Classificação final */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/50">
              <h3 className="font-semibold text-sm">Classificação</h3>
            </div>
            <div className="px-4 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left py-1.5 w-6">#</th>
                    <th className="text-left py-1.5">Time</th>
                    <th className="text-center py-1.5 w-8">J</th>
                    <th className="text-center py-1.5 w-8">V</th>
                    <th className="text-center py-1.5 w-8">E</th>
                    <th className="text-center py-1.5 w-8">D</th>
                    <th className="text-center py-1.5 w-10">SG</th>
                    <th className="text-center py-1.5 w-8 font-semibold">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {standings.map((s, i) => (
                    <tr key={s.teamId}>
                      <td className="py-2 text-muted-foreground text-xs">
                        {i + 1}
                      </td>
                      <td className="py-2 font-medium">Time {s.teamNumber}</td>
                      <td className="py-2 text-center tabular-nums">
                        {s.played}
                      </td>
                      <td className="py-2 text-center tabular-nums">
                        {s.wins}
                      </td>
                      <td className="py-2 text-center tabular-nums">
                        {s.draws}
                      </td>
                      <td className="py-2 text-center tabular-nums">
                        {s.losses}
                      </td>
                      <td className="py-2 text-center tabular-nums">
                        {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                      </td>
                      <td className="py-2 text-center tabular-nums font-semibold">
                        {s.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partidas por fase */}
          {matchesByPhase.map(({ phase, matches: phaseMatches }) => (
            <div
              key={phase}
              className="rounded-lg border border-border overflow-hidden"
            >
              <div className="px-4 py-2 bg-muted/50">
                <h3 className="font-semibold text-sm">{phaseLabel[phase]}</h3>
              </div>
              <ul className="divide-y divide-border">
                {phaseMatches.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="font-medium">
                      Time {teamMap.get(m.home_team_id) ?? "?"}
                    </span>
                    <span className="tabular-nums font-bold text-base">
                      {m.home_score ?? "—"} × {m.away_score ?? "—"}
                    </span>
                    <span className="font-medium">
                      Time {teamMap.get(m.away_team_id) ?? "?"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
