import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { GameCard } from '@/components/player/game-card';
import { PlayerDataSection } from '@/components/player/player-data-section';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';
import { AppLogo } from '@/components/app-logo';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { code } = await params;
  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, name')
    .eq('access_code', code.toUpperCase())
    .maybeSingle();

  if (!team) notFound();

  // Lê telefone do cookie — sem ele, redireciona para identificação
  const cookieStore = await cookies();
  const playerPhone = cookieStore.get(`player_${team.id}`)?.value;
  if (!playerPhone) redirect(`/jogador/${code.toUpperCase()}/entrar`);

  // Jogos em aberto nos próximos 7 dias
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: games } = await service
    .from('games')
    .select('id, location, scheduled_at, status, is_tournament, draw_done')
    .eq('team_id', team.id)
    .eq('status', 'open')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', sevenDaysLater.toISOString())
    .order('scheduled_at', { ascending: true });

  const gameList = games ?? [];

  // IDs de jogos com campeonato e sorteio feito para verificar se fase de grupos iniciou
  const openTournamentGameIds = gameList
    .filter(g => g.is_tournament && g.draw_done)
    .map(g => g.id);

  // Busca dados do jogador, confirmações e partidas de grupo concluídas em paralelo
  const [playerResult, confirmationsResult, startedMatchesResult] =
    await Promise.all([
      playerPhone
        ? service
            .from('players')
            .select(
              'id, name, phone, weight_kg, stamina, is_star, is_banned, suspended_until, suspension_reason',
            )
            .eq('team_id', team.id)
            .eq('phone', playerPhone)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      gameList.length > 0
        ? service
            .from('game_confirmations')
            .select('game_id, player_id, status')
            .in(
              'game_id',
              gameList.map(g => g.id),
            )
            .in('status', ['confirmed', 'waitlist'])
        : Promise.resolve({ data: [] }),

      openTournamentGameIds.length > 0
        ? service
            .from('tournament_matches')
            .select('game_id')
            .in('game_id', openTournamentGameIds)
            .eq('phase', 'group')
            .eq('completed', true)
            .limit(openTournamentGameIds.length)
        : Promise.resolve({ data: [] }),
    ]);

  const playerData = playerResult.data;
  const confirmations = confirmationsResult.data ?? [];

  // Set de game_ids onde a fase de grupos já começou (ao menos 1 partida concluída)
  const tournamentStartedGameIds = new Set(
    (startedMatchesResult.data ?? []).map(m => m.game_id),
  );

  // Busca o último jogo finalizado em que o jogador participou
  let lastGame: {
    id: string;
    location: string | null;
    scheduled_at: string;
    status: string;
    is_tournament: boolean;
    draw_done: boolean;
  } | null = null;
  let lastGameConfirmedCount = 0;

  if (playerData) {
    const { data: playerConfirmedGames } = await service
      .from('game_confirmations')
      .select('game_id')
      .eq('player_id', playerData.id)
      .in('status', ['confirmed', 'waitlist']);

    const playerGameIds = (playerConfirmedGames ?? []).map(c => c.game_id);

    if (playerGameIds.length > 0) {
      const { data: lastGameRaw } = await service
        .from('games')
        .select('id, location, scheduled_at, status, is_tournament, draw_done')
        .eq('team_id', team.id)
        .eq('status', 'finished')
        .in('id', playerGameIds)
        .order('finished_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (lastGameRaw) {
        lastGame = lastGameRaw;
        const { count } = await service
          .from('game_confirmations')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', lastGameRaw.id)
          .eq('status', 'confirmed');
        lastGameConfirmedCount = count ?? 0;
      }
    }
  }

  // Monta mapa de contagens e status do jogador por jogo
  const gameStats: Record<
    string,
    { confirmedCount: number; playerStatus: string | null }
  > = {};

  for (const game of gameList) {
    const gameConfirmations = confirmations.filter(c => c.game_id === game.id);
    const confirmedCount = gameConfirmations.filter(
      c => c.status === 'confirmed',
    ).length;
    const playerConfirmation = playerData
      ? gameConfirmations.find(c => c.player_id === playerData.id)
      : null;

    gameStats[game.id] = {
      confirmedCount,
      playerStatus: playerConfirmation?.status ?? null,
    };
  }

  // Verifica se o jogador identificado pelo cookie está banido ou suspenso
  const isBanned = playerData?.is_banned === true;
  const isActivelySuspended =
    !!playerData?.suspended_until &&
    new Date(playerData.suspended_until) > new Date();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
        <p className="text-sm mt-4 font-bold" style={{ color: '#002776' }}>
          {team.name}
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-4 pt-6 pb-24 space-y-4">

      {isBanned && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
          <p className="font-semibold text-destructive">Acesso bloqueado</p>
          <p className="text-muted-foreground">
            Você foi banido desta turma e não pode confirmar presença nos jogos.
            Em caso de dúvidas, entre em contato com o organizador.
          </p>
        </div>
      )}

      {!isBanned && isActivelySuspended && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
          <p className="font-semibold text-destructive">
            Suspenso até{' '}
            {new Date(playerData!.suspended_until!).toLocaleDateString(
              'pt-BR',
              { day: '2-digit', month: '2-digit', year: 'numeric' },
            )}
          </p>
          {playerData?.suspension_reason && (
            <p className="text-muted-foreground">
              {playerData.suspension_reason}
            </p>
          )}
          <p className="text-muted-foreground">
            Você não pode confirmar presença durante este período.
          </p>
        </div>
      )}

      {gameList.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          Nenhum jogo marcado para os próximos 7 dias.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-center text-foreground">
            Próximos 7 dias
          </p>
          {gameList.map(game => (
            <GameCard
              key={game.id}
              game={game}
              teamId={team.id}
              teamCode={code.toUpperCase()}
              confirmedCount={gameStats[game.id].confirmedCount}
              playerStatus={gameStats[game.id].playerStatus}
              phone={playerPhone}
              tournamentStarted={tournamentStartedGameIds.has(game.id)}
            />
          ))}
        </div>
      )}

      {lastGame && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Último jogo
          </h2>
          <GameCard
            game={lastGame}
            teamId={team.id}
            teamCode={code.toUpperCase()}
            confirmedCount={lastGameConfirmedCount}
            playerStatus="confirmed"
            phone={playerPhone}
            detailsHref={`/jogador/${code.toUpperCase()}/historico/${lastGame.id}`}
          />
        </div>
      )}

      {playerData && (
        <PlayerDataSection
          player={playerData}
          teamId={team.id}
          teamCode={code.toUpperCase()}
        />
      )}

      <PlayerBottomNav teamCode={code.toUpperCase()} />
      </div>
    </div>
  );
}
