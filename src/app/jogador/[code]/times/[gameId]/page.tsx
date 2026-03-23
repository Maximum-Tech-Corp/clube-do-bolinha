import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';

interface Props {
  params: Promise<{ code: string; gameId: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
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
    .select('id, team_number')
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
      ? await service.from('players').select('id, name').in('id', playerIds)
      : { data: [] };

  const playerMap = new Map((playersRaw ?? []).map(p => [p.id, p.name]));

  const teamsData = (gameTeams ?? []).map(gt => ({
    teamNumber: gt.team_number,
    players: (teamPlayersRaw ?? [])
      .filter(tp => tp.game_team_id === gt.id)
      .map(tp => playerMap.get(tp.player_id) ?? '—'),
  }));

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/jogador/${upperCode}`}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Times sorteados</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDate(game.scheduled_at)}
            {game.location ? ` · ${game.location}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {teamsData.map(team => (
          <div
            key={team.teamNumber}
            className="rounded-lg border border-border overflow-hidden"
          >
            <div className="px-4 py-2 bg-muted/50">
              <h2 className="font-semibold text-sm">Time {team.teamNumber}</h2>
            </div>
            <ul className="divide-y divide-border">
              {team.players.map((name, i) => (
                <li key={i} className="px-4 py-2.5 text-sm font-medium">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </div>
  );
}
