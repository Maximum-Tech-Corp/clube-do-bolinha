import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';

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

export default async function PlayerTimesPage({ params }: Props) {
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
    .select('id, scheduled_at, location, status, draw_done')
    .eq('id', gameId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!game || !game.draw_done || game.status !== 'open') notFound();

  const { data: gameTeams } = await service
    .from('game_teams')
    .select('id, team_number, custom_name')
    .eq('game_id', gameId)
    .order('team_number');

  const teamIds = (gameTeams ?? []).map(t => t.id);

  const { data: teamPlayersRaw } =
    teamIds.length > 0
      ? await service
          .from('game_team_players')
          .select('game_team_id, player_id')
          .in('game_team_id', teamIds)
      : { data: [] };

  const playerIds = (teamPlayersRaw ?? []).map(tp => tp.player_id);

  const { data: playersRaw } =
    playerIds.length > 0
      ? await service
          .from('players')
          .select('id, name, is_star')
          .in('id', playerIds)
      : { data: [] };

  const playerMap = new Map(
    (playersRaw ?? []).map(p => [p.id, { name: p.name, isStar: p.is_star }]),
  );

  const teamsData = (gameTeams ?? []).map(gt => ({
    teamNumber: gt.team_number,
    customName: gt.custom_name,
    players: (teamPlayersRaw ?? [])
      .filter(tp => tp.game_team_id === gt.id)
      .map(tp => playerMap.get(tp.player_id) ?? { name: '—', isStar: false }),
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
            Times sorteados
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <p className="text-sm text-muted-foreground">
          {formatDate(game.scheduled_at)}
          {game.location ? ` · ${game.location}` : ''}
        </p>

        <div className="space-y-3">
          {teamsData.map(t => (
            <div
              key={t.teamNumber}
              className="rounded-lg shadow-md bg-gray-50 overflow-hidden"
            >
              <div className="px-4 py-2 bg-primary/10">
                <h2 className="font-semibold text-sm text-primary">
                  {t.customName ?? `Time ${t.teamNumber}`}
                </h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {t.players.map((player, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium"
                  >
                    {player.isStar && <span>⭐</span>}
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </>
  );
}
