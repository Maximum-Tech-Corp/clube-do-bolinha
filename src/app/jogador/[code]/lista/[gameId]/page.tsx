import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';

interface Props {
  params: Promise<{ code: string; gameId: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PlayerListaPage({ params }: Props) {
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

  if (!game) notFound();

  // Se o sorteio já foi feito, redireciona para a página de times
  if (game.draw_done) redirect(`/jogador/${upperCode}/times/${gameId}`);

  // Se o jogo não está mais aberto, volta para a turma
  if (game.status !== 'open') redirect(`/jogador/${upperCode}`);

  const { data: confirmationsRaw } = await service
    .from('game_confirmations')
    .select('player_id, status')
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  const playerIds = (confirmationsRaw ?? []).map(c => c.player_id);

  const { data: playersRaw } =
    playerIds.length > 0
      ? await service
          .from('players')
          .select('id, name')
          .in('id', playerIds)
          .order('name')
      : { data: [] };

  const players = playersRaw ?? [];

  return (
    <>
      <div className="w-full" style={{ backgroundColor: '#fed015' }}>
        <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
          <Link href={`/jogador/${upperCode}`} aria-label="Voltar" className="shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: '#002776' }} />
          </Link>
          <h1 className="text-lg font-bold flex-1" style={{ color: '#002776' }}>
            Lista de confirmados
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <p className="text-sm text-muted-foreground capitalize">
          {formatDate(game.scheduled_at)}
          {game.location ? ` · ${game.location}` : ''}
        </p>

        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum jogador confirmado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {players.length} confirmado{players.length !== 1 ? 's' : ''}
            </p>
            <ul className="space-y-2">
              {players.map(player => (
                <li key={player.id} className="rounded-lg shadow-md bg-gray-50 px-3 py-2 text-sm font-medium">
                  {player.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </>
  );
}
