import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { Badge } from '@/components/ui/badge';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import type { TournamentPhase } from '@/types/database.types';

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const phaseLabel: Record<TournamentPhase, string> = {
  group: 'Fase de Grupos',
  semi: 'Semifinais',
  final: 'Final',
};

export default async function HistoricoDetailPage({ params }: Props) {
  const { id: gameId } = await params;

  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();
  if (!team) redirect('/login');

  const { data: game } = await service
    .from('games')
    .select('id, location, scheduled_at, status, is_tournament, finished_at')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game) notFound();
  if (game.status !== 'finished') redirect(`/dashboard/jogos/${gameId}`);

  // Busca times e partidas em paralelo
  const [{ data: gameTeamsRaw }, { data: matchesRaw }] = await Promise.all([
    service
      .from('game_teams')
      .select('id, team_number, custom_name')
      .eq('game_id', gameId)
      .order('team_number'),
    game.is_tournament
      ? service
          .from('tournament_matches')
          .select('*')
          .eq('game_id', gameId)
          .order('match_order')
      : Promise.resolve({ data: [] }),
  ]);

  const gameTeams = gameTeamsRaw ?? [];
  const teamIds = gameTeams.map(t => t.id);

  // Busca players de cada time e seus stats
  const { data: gtpRaw } =
    teamIds.length > 0
      ? await service
          .from('game_team_players')
          .select('id, game_team_id, player_id, goals, assists')
          .in('game_team_id', teamIds)
      : { data: [] };

  const gtp = gtpRaw ?? [];
  const playerIds = gtp.map(p => p.player_id);

  const { data: playersRaw } =
    playerIds.length > 0
      ? await service
          .from('players')
          .select('id, name, is_star')
          .in('id', playerIds)
      : { data: [] };

  const playerMap = new Map((playersRaw ?? []).map(p => [p.id, p]));
  const teamMap = new Map(gameTeams.map(t => [t.id, t.team_number]));
  const nameMap = new Map(
    gameTeams.map(t => [t.id, t.custom_name ?? `Time ${t.team_number}`]),
  );

  // Monta dados dos times
  const teamsData = gameTeams.map(gt => ({
    teamNumber: gt.team_number,
    customName: gt.custom_name,
    players: gtp
      .filter(p => p.game_team_id === gt.id)
      .map(p => {
        const player = playerMap.get(p.player_id);
        return {
          name: player?.name ?? '—',
          isStar: player?.is_star ?? false,
          goals: p.goals,
          assists: p.assists,
        };
      })
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists),
  }));

  // Destaques do jogo
  const allPlayers = gtp.map(p => {
    const player = playerMap.get(p.player_id);
    return { name: player?.name ?? '—', goals: p.goals, assists: p.assists };
  });

  const withGoals = allPlayers.filter(p => p.goals > 0);
  const withAssists = allPlayers.filter(p => p.assists > 0);
  const withContrib = allPlayers.filter(p => p.goals + p.assists > 0);

  const maxContrib =
    withContrib.length > 0
      ? Math.max(...withContrib.map(p => p.goals + p.assists))
      : 0;
  const mvpCandidates = withContrib.filter(
    p => p.goals + p.assists === maxContrib,
  );
  const mvp = mvpCandidates.length === 1 ? mvpCandidates[0] : null;
  const mvpTied = withContrib.length > 0 && mvpCandidates.length > 1;

  const maxGoals =
    withGoals.length > 0 ? Math.max(...withGoals.map(p => p.goals)) : 0;
  const scorerCandidates = withGoals.filter(p => p.goals === maxGoals);
  const topScorer = scorerCandidates.length === 1 ? scorerCandidates[0] : null;
  const topScorerTied = withGoals.length > 0 && scorerCandidates.length > 1;

  const maxAssists =
    withAssists.length > 0 ? Math.max(...withAssists.map(p => p.assists)) : 0;
  const assisterCandidates = withAssists.filter(p => p.assists === maxAssists);
  const topAssister =
    assisterCandidates.length === 1 ? assisterCandidates[0] : null;
  const topAssisterTied =
    withAssists.length > 0 && assisterCandidates.length > 1;

  // Dados do campeonato
  const matches = (matchesRaw ?? []) as MatchRow[];
  const groupMatches = matches.filter(m => m.phase === 'group');
  const standings = game.is_tournament
    ? computeStandings(groupMatches, teamMap)
    : [];

  const matchesByPhase = (['group', 'semi', 'final'] as TournamentPhase[])
    .map(phase => ({
      phase,
      matches: matches.filter(m => m.phase === phase),
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
      {(mvp ||
        mvpTied ||
        topScorer ||
        topScorerTied ||
        topAssister ||
        topAssisterTied) && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {(mvp || mvpTied) && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Craque do racha</span>
              <span className="font-semibold">
                {mvpTied ? (
                  <span className="font-normal text-muted-foreground">
                    Houve empate
                  </span>
                ) : (
                  <>
                    {mvp?.name}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {mvp?.goals}G · {mvp?.assists}A
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
          {(topScorer || topScorerTied) && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Artilheiro</span>
              <span className="font-semibold">
                {topScorerTied ? (
                  <span className="font-normal text-muted-foreground">
                    Houve empate
                  </span>
                ) : (
                  <>
                    {topScorer?.name}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {topScorer?.goals}G
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
          {(topAssister || topAssisterTied) && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">
                Líder em assistências
              </span>
              <span className="font-semibold">
                {topAssisterTied ? (
                  <span className="font-normal text-muted-foreground">
                    Houve empate
                  </span>
                ) : (
                  <>
                    {topAssister?.name}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {topAssister?.assists}A
                    </span>
                  </>
                )}
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
        {teamsData.map(team => {
          const totalGoals = team.players.reduce((s, p) => s + p.goals, 0);
          return (
            <div
              key={team.teamNumber}
              className="rounded-lg border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                <h3 className="font-semibold text-sm">
                  {team.customName ?? `Time ${team.teamNumber}`}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {totalGoals} gol{totalGoals !== 1 ? 's' : ''}
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
                      <td className="py-2 font-medium">
                        {nameMap.get(s.teamId) ?? `Time ${s.teamNumber}`}
                      </td>
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
                {phaseMatches.map(m => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {nameMap.get(m.home_team_id) ?? '?'}
                    </span>
                    <span className="tabular-nums font-bold text-base">
                      {m.home_score ?? '—'} × {m.away_score ?? '—'}
                    </span>
                    <span className="font-medium">
                      {nameMap.get(m.away_team_id) ?? '?'}
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
