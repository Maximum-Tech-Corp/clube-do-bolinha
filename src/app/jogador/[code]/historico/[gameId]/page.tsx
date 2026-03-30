import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';
import { PlayerCampeonatoAccordion } from '@/components/player/player-campeonato-accordion';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import type { TournamentPhase } from '@/types/database.types';

interface Props {
  params: Promise<{ code: string; gameId: string }>;
}

function formatDateShort(iso: string) {
  const formatted = new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

export default async function PlayerHistoricoDetailPage({ params }: Props) {
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
    .select('id, location, scheduled_at, status, is_tournament, finished_at')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game || game.status !== 'finished') notFound();

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

  // Destaques
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

  // Campeonato
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

  // Dados para PlayerCampeonatoAccordion
  const teamsForAccordion = gameTeams.map(gt => ({
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

  const standingsForAccordion = standings.map((s, i) => ({
    rank: i + 1,
    name: nameMap.get(s.teamId) ?? `Time ${s.teamNumber}`,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalDiff: s.goalDiff,
    points: s.points,
  }));

  const matchesForAccordion = matchesByPhase.map(({ phase, matches: ms }) => ({
    phase,
    label: phaseLabel[phase],
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header amarelo com seta de voltar */}
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
            {formatDateShort(game.scheduled_at)}
          </h1>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Local e badges */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {game.location ?? 'Local não definido'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {game.is_tournament && (
              <span className="text-xs font-medium border border-border rounded px-2 py-0.5 text-muted-foreground">
                Campeonato
              </span>
            )}
            <span className="text-xs font-medium border border-border rounded px-2 py-0.5 text-muted-foreground">
              Finalizado
            </span>
          </div>
        </div>

        {/* Destaques */}
        {(mvp ||
          mvpTied ||
          topScorer ||
          topScorerTied ||
          topAssister ||
          topAssisterTied) && (
          <div className="rounded-lg shadow-md bg-gray-50 divide-y divide-gray-200">
            {(mvp || mvpTied) && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-primary font-medium">Craque do racha</span>
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
                <span className="text-primary font-medium">Artilheiro</span>
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
                <span className="text-primary font-medium">
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

        {/* Times + Campeonato em accordions */}
        <PlayerCampeonatoAccordion
          teamsData={teamsForAccordion}
          standingsData={standingsForAccordion}
          matchesData={matchesForAccordion}
        />
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </div>
  );
}
