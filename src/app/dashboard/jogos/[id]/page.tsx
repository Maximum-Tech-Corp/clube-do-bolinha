import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { GameDetailClient } from '@/components/dashboard/game-detail-client';
import { TournamentToggle } from '@/components/dashboard/tournament-toggle';
import { TeamsClient } from '@/components/dashboard/teams-client';
import { TournamentClient } from '@/components/dashboard/tournament-client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';
import type { TournamentPhase } from '@/types/database.types';

interface Props {
  params: Promise<{ id: string }>;
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

export default async function GameDetailPage({ params }: Props) {
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
    .select('id, location, scheduled_at, status, draw_done, is_tournament')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game) notFound();

  // Fetch drawn teams (needed for team count, stat check, and inline rendering)
  let teamCount = 0;
  let hasAnyStats = false;
  let gameTeams: {
    id: string;
    team_number: number;
    custom_name: string | null;
  }[] = [];
  let teamPlayers: {
    id: string;
    game_team_id: string;
    player_id: string;
    goals: number;
    assists: number;
  }[] = [];
  let playerMap = new Map<
    string,
    { id: string; name: string; is_star: boolean }
  >();
  let tournamentCompleted = false;
  let matchesData: {
    id: string;
    phase: TournamentPhase;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    matchOrder: number;
    completed: boolean;
  }[] = [];
  let standingsData: {
    teamId: string;
    teamNumber: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
  }[] = [];

  if (game.draw_done) {
    const { data: gameTeamsRaw } = await service
      .from('game_teams')
      .select('id, team_number, custom_name')
      .eq('game_id', gameId)
      .order('team_number');

    gameTeams = gameTeamsRaw ?? [];
    teamCount = gameTeams.length;
    const teamIds = gameTeams.map(t => t.id);

    if (teamIds.length > 0) {
      const { data: teamPlayersRaw } = await service
        .from('game_team_players')
        .select('id, game_team_id, player_id, goals, assists')
        .in('game_team_id', teamIds);

      teamPlayers = teamPlayersRaw ?? [];

      const hasGoalsOrAssists = teamPlayers.some(
        tp => (tp.goals ?? 0) > 0 || (tp.assists ?? 0) > 0,
      );
      hasAnyStats = hasGoalsOrAssists;

      if (!hasAnyStats && game.is_tournament) {
        const { count: tournamentCount } = await service
          .from('tournament_matches')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .not('home_score', 'is', null);
        hasAnyStats = (tournamentCount ?? 0) > 0;
      }

      // For finished games, load full player details and tournament data for inline rendering
      if (game.status === 'finished') {
        const playerIds = teamPlayers.map(tp => tp.player_id);

        const [playersResult, tournamentResult] = await Promise.all([
          playerIds.length > 0
            ? service
                .from('players')
                .select('id, name, is_star')
                .in('id', playerIds)
            : Promise.resolve({ data: [] }),

          game.is_tournament
            ? service
                .from('tournament_matches')
                .select('*')
                .eq('game_id', gameId)
                .order('match_order')
            : Promise.resolve({ data: [] }),
        ]);

        playerMap = new Map(
          (
            (playersResult.data ?? []) as {
              id: string;
              name: string;
              is_star: boolean;
            }[]
          ).map(p => [p.id, p]),
        );

        if (game.is_tournament) {
          const matches = (tournamentResult.data ?? []) as MatchRow[];
          const teamNumberMap = new Map(
            gameTeams.map(t => [t.id, t.team_number]),
          );
          const groupMatches = matches.filter(m => m.phase === 'group');
          const standings = computeStandings(groupMatches, teamNumberMap);

          const total = matches.length;
          const completed = matches.filter(m => m.completed).length;
          tournamentCompleted = total > 0 && completed === total;

          matchesData = matches.map(m => ({
            id: m.id,
            phase: m.phase as TournamentPhase,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            homeScore: m.home_score,
            awayScore: m.away_score,
            matchOrder: m.match_order,
            completed: m.completed,
          }));

          standingsData = standings.map(s => ({
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
        }
      }
    }
  }

  // Busca confirmações (confirmed + waitlist)
  const { data: confirmations } = await service
    .from('game_confirmations')
    .select('id, player_id, status, waitlist_position')
    .eq('game_id', gameId)
    .in('status', ['confirmed', 'waitlist'])
    .order('waitlist_position', { ascending: true });

  const confirmedRows = (confirmations ?? []).filter(
    c => c.status === 'confirmed',
  );
  const waitlistRows = (confirmations ?? []).filter(
    c => c.status === 'waitlist',
  );

  const allPlayerIds = (confirmations ?? []).map(c => c.player_id);

  // Busca detalhes dos jogadores já na lista
  const [playersInGameResult, availablePlayersResult] = await Promise.all([
    allPlayerIds.length > 0
      ? service
          .from('players')
          .select('id, name, phone, is_banned, suspended_until')
          .in('id', allPlayerIds)
      : Promise.resolve({ data: [] }),

    // Jogadores da turma que ainda não estão no jogo
    service
      .from('players')
      .select('id, name, is_banned, suspended_until')
      .eq('team_id', team.id)
      .not(
        'id',
        'in',
        allPlayerIds.length > 0
          ? `(${allPlayerIds.join(',')})`
          : '(00000000-0000-0000-0000-000000000000)',
      )
      .order('name'),
  ]);

  const confirmationPlayerMap = new Map(
    (playersInGameResult.data ?? []).map(p => [p.id, p]),
  );

  const confirmed = confirmedRows.map(c => ({
    confirmationId: c.id,
    player: confirmationPlayerMap.get(c.player_id) ?? {
      id: c.player_id,
      name: '—',
      phone: '',
      is_banned: false,
      suspended_until: null,
    },
  }));

  const waitlist = waitlistRows.map(c => ({
    confirmationId: c.id,
    position: c.waitlist_position ?? 0,
    player: confirmationPlayerMap.get(c.player_id) ?? {
      id: c.player_id,
      name: '—',
      phone: '',
      is_banned: false,
      suspended_until: null,
    },
  }));

  const availablePlayers = (availablePlayersResult.data ?? []) as {
    id: string;
    name: string;
    is_banned: boolean;
    suspended_until: string | null;
  }[];

  const statusLabel = {
    open: 'Aberto',
    cancelled: 'Cancelado',
    finished: 'Finalizado',
  } as const;

  // Build teamsData for TeamsClient (used in finished game inline view)
  const teamsData = gameTeams.map(gt => ({
    id: gt.id,
    teamNumber: gt.team_number,
    customName: gt.custom_name,
    players: teamPlayers
      .filter(tp => tp.game_team_id === gt.id)
      .map(tp => {
        const player = playerMap.get(tp.player_id);
        return {
          gameTeamPlayerId: tp.id,
          playerId: tp.player_id,
          name: player?.name ?? '—',
          isStar: player?.is_star ?? false,
          goals: tp.goals,
          assists: tp.assists,
        };
      }),
  }));

  return (
    <>
      <AdminPageHeader
        title={formatDateShort(game.scheduled_at)}
        backHref="/dashboard/jogos"
      />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {game.location ?? 'Local não definido'}
            {game.draw_done &&
              game.status !== 'cancelled' &&
              ' · Sorteio realizado'}
          </p>
          <Badge
            variant={
              game.status === 'open'
                ? 'default'
                : game.status === 'cancelled'
                  ? 'outline'
                  : 'secondary'
            }
            className="shrink-0"
          >
            {statusLabel[game.status]}
          </Badge>
        </div>

        {/* Open game with draw done: navigation links to dedicated pages */}
        {game.draw_done && game.status === 'open' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/jogos/${gameId}/times`}
                className="flex-1 inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium py-2.5 hover:bg-primary/10 transition-colors"
              >
                Ver times
              </Link>
              {game.is_tournament && (
                <Link
                  href={`/dashboard/jogos/${gameId}/campeonato`}
                  className="flex-1 inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium py-2.5 hover:bg-primary/10 transition-colors"
                >
                  Ver campeonato
                </Link>
              )}
            </div>
            {teamCount >= 4 && (
              <>
                <TournamentToggle
                  gameId={gameId}
                  isTournament={game.is_tournament}
                />
                <Separator />
              </>
            )}
          </div>
        )}

        {/* Finished game with draw done: inline teams and tournament */}
        {game.draw_done && game.status === 'finished' && (
          <div className="space-y-6">
            <TeamsClient
              gameId={gameId}
              teams={teamsData}
              isFinished={true}
              isTournament={game.is_tournament}
              tournamentCompleted={tournamentCompleted}
            />
            {game.is_tournament && matchesData.length > 0 && (
              <>
                <Separator />
                <TournamentClient
                  gameId={gameId}
                  nTeams={gameTeams.length}
                  teams={gameTeams.map(t => ({
                    id: t.id,
                    teamNumber: t.team_number,
                    customName: t.custom_name,
                  }))}
                  matches={matchesData}
                  standings={standingsData}
                  isFinished={true}
                />
              </>
            )}
          </div>
        )}

        {game.status === 'cancelled' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <span className="mt-px shrink-0 font-bold">i</span>
              <span>Este jogo foi cancelado.</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Jogadores que haviam confirmado ({confirmed.length}):
              </p>
              {confirmed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma confirmação registrada.
                </p>
              ) : (
                <ul className="space-y-1">
                  {confirmed.map(({ confirmationId, player }) => (
                    <li
                      key={confirmationId}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{player.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {player.phone}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {waitlist.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Lista de espera ({waitlist.length}):
                </p>
                <ul className="space-y-1">
                  {waitlist.map(({ confirmationId, position, player }) => (
                    <li
                      key={confirmationId}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="text-xs text-muted-foreground w-4 shrink-0">
                        {position}
                      </span>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {player.phone}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Área interativa: apenas para jogos abertos */}
        {game.status === 'open' && (
          <GameDetailClient
            gameId={gameId}
            drawDone={game.draw_done}
            hasAnyStats={hasAnyStats}
            confirmed={confirmed}
            waitlist={waitlist}
            availablePlayers={availablePlayers}
          />
        )}
      </div>
    </>
  );
}
