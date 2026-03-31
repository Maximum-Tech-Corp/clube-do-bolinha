import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { TournamentClient } from '@/components/dashboard/tournament-client';
import { MatchTimer } from '@/components/dashboard/match-timer';
import { computeStandings, buildGroupMatchOrder } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampeonatoPage({ params }: Props) {
  const { id: gameId } = await params;

  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, match_duration_minutes')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();
  if (!team) redirect('/login');

  const { data: game } = await service
    .from('games')
    .select('id, is_tournament, draw_done, status')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game) notFound();
  if (!game.draw_done || !game.is_tournament)
    redirect(`/dashboard/jogos/${gameId}`);

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
  let matches = (matchesRaw ?? []) as MatchRow[];

  // Gera partidas da fase de grupos se ainda não existem
  // (ocorre quando o modo campeonato é ativado após o sorteio via TournamentToggle)
  const groupMatchesExist = matches.some(m => m.phase === 'group');
  if (!groupMatchesExist && gameTeams.length >= 4) {
    const ids = gameTeams.map(t => t.id);
    const pairs = buildGroupMatchOrder(ids);
    const inserts = pairs.map(([home, away], idx) => ({
      game_id: gameId,
      phase: 'group' as const,
      home_team_id: home,
      away_team_id: away,
      match_order: idx + 1,
    }));

    const { data: inserted } = await service
      .from('tournament_matches')
      .insert(inserts)
      .select('*');

    matches = [...((inserted ?? []) as MatchRow[]), ...matches];
  }

  const teamMap = new Map(gameTeams.map(t => [t.id, t.team_number]));

  const groupMatches = matches.filter(m => m.phase === 'group');
  const standings = computeStandings(groupMatches, teamMap);

  const teamsData = gameTeams.map(t => ({
    id: t.id,
    teamNumber: t.team_number,
    customName: t.custom_name,
  }));

  const matchesData = matches.map(m => ({
    id: m.id,
    phase: m.phase,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeScore: m.home_score,
    awayScore: m.away_score,
    matchOrder: m.match_order,
    completed: m.completed,
  }));

  const standingsData = standings.map(s => ({
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
    <>
      <AdminPageHeader
        title="Campeonato"
        backHref={`/dashboard/jogos/${gameId}`}
      />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Link
          href={`/dashboard/jogos/${gameId}/times`}
          className="inline-flex w-full items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium py-2.5 hover:bg-primary/10 transition-colors"
        >
          Ver times
        </Link>

        {game.status !== 'finished' && (
          <MatchTimer
            gameId={`${gameId}_camp`}
            defaultMinutes={team.match_duration_minutes ?? 10}
          />
        )}

        <TournamentClient
          gameId={gameId}
          nTeams={gameTeams.length}
          teams={teamsData}
          matches={matchesData}
          standings={standingsData}
          isFinished={game.status === 'finished'}
        />
      </div>
    </>
  );
}
