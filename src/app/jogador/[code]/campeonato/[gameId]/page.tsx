import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import type { TournamentPhase } from '@/types/database.types';
import { PlayerCampeonatoAccordion } from '@/components/player/player-campeonato-accordion';

interface Props {
  params: Promise<{ code: string; gameId: string }>;
}

function formatDate(iso: string) {
  const formatted = new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
    id: gt.id,
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
      label: phaseLabel[phase],
      matches: matches
        .filter(m => m.phase === phase)
        .sort((a, b) => a.match_order - b.match_order),
    }))
    .filter(({ matches: ms }) => ms.length > 0);

  const standingsData = standings.map((s, i) => ({
    rank: i + 1,
    name: nameMap.get(s.teamId) ?? `Time ${s.teamNumber}`,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalDiff: s.goalDiff,
    points: s.points,
  }));

  const matchesData = matchesByPhase.map(({ phase, label, matches: ms }) => ({
    phase,
    label,
    matches: ms.map(m => ({
      id: m.id,
      homeTeam: nameMap.get(m.home_team_id) ?? '?',
      awayTeam: nameMap.get(m.away_team_id) ?? '?',
      homeScore: m.home_score,
      awayScore: m.away_score,
      completed: m.completed,
    })),
  }));

  return (
    <>
      <div className="w-full" style={{ backgroundColor: '#fed015' }}>
        <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
          <Link
            href={`/jogador/${upperCode}`}
            aria-label="Voltar"
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#002776' }} />
          </Link>
          <h1 className="text-lg font-bold flex-1" style={{ color: '#002776' }}>
            Acompanhar jogos
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <p className="text-sm text-muted-foreground capitalize">
          {formatDate(game.scheduled_at)}
          {game.location ? ` · ${game.location}` : ''}
        </p>

        <PlayerCampeonatoAccordion
          teamsData={teamsData}
          standingsData={standingsData}
          matchesData={matchesData}
        />
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </>
  );
}
