import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import type { TournamentPhase } from '@/types/database.types';

interface Props {
  params: Promise<{ code: string; gameId: string }>;
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

export default async function PlayerCampeonatoPage({ params }: Props) {
  const { code, gameId } = await params;
  const upperCode = code.toUpperCase();
  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, name')
    .eq('access_code', upperCode)
    .maybeSingle();

  if (!team) notFound();

  const { data: game } = await service
    .from('games')
    .select('id, location, scheduled_at, status, is_tournament, draw_done')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game || !game.is_tournament || !game.draw_done) notFound();

  const [{ data: gameTeamsRaw }, { data: matchesRaw }] = await Promise.all([
    service
      .from('game_teams')
      .select('id, team_number, custom_name')
      .eq('game_id', gameId)
      .order('team_number'),
    service
      .from('tournament_matches')
      .select('*')
      .eq('game_id', gameId)
      .order('match_order'),
  ]);

  const gameTeams = gameTeamsRaw ?? [];
  const teamIds = gameTeams.map(t => t.id);
  const teamMap = new Map(gameTeams.map(t => [t.id, t.team_number]));
  const nameMap = new Map(
    gameTeams.map(t => [t.id, t.custom_name ?? `Time ${t.team_number}`]),
  );

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

  const matches = (matchesRaw ?? []) as MatchRow[];
  const groupMatches = matches.filter(m => m.phase === 'group');
  const standings = computeStandings(groupMatches, teamMap);

  const matchesByPhase = (['group', 'semi', 'final'] as TournamentPhase[])
    .map(phase => ({
      phase,
      matches: matches.filter(m => m.phase === phase),
    }))
    .filter(({ matches: ms }) => ms.length > 0);

  const isFinished = game.status === 'finished';

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-2">
        <Link
          href={`/jogador/${upperCode}`}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0 mt-0.5"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-tight">
              {formatDate(game.scheduled_at)}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium border border-border rounded px-2 py-0.5 text-muted-foreground">
                Campeonato
              </span>
              {isFinished && (
                <span className="text-xs font-medium border border-border rounded px-2 py-0.5 text-muted-foreground">
                  Finalizado
                </span>
              )}
            </div>
          </div>
          {game.location && (
            <p className="text-sm text-muted-foreground">{game.location}</p>
          )}
        </div>
      </div>

      {/* Times */}
      {teamsData.length > 0 && (
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
      )}

      {/* Campeonato */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Campeonato
        </h2>

        {standings.length > 0 && (
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
        )}

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
                    {m.completed
                      ? `${m.home_score ?? 0} × ${m.away_score ?? 0}`
                      : '— × —'}
                  </span>
                  <span className="font-medium">
                    {nameMap.get(m.away_team_id) ?? '?'}
                  </span>
                  {!m.completed && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Pendente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <PlayerBottomNav teamCode={upperCode} />
    </div>
  );
}
