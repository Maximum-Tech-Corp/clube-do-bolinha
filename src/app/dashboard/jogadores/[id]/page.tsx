import { notFound } from 'next/navigation';
import { getPlayer, getPlayerStats } from '@/actions/players-admin';
import { EditPlayerForm } from '@/components/dashboard/edit-player-form';
import { RetroactiveStatForm } from '@/components/dashboard/retroactive-stat-form';
import { PlayerSituationForm } from '@/components/dashboard/player-situation-form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlayerPage({ params }: Props) {
  const { id } = await params;
  const [player, stats] = await Promise.all([
    getPlayer(id),
    getPlayerStats(id),
  ]);

  if (!player) notFound();

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{player.name}</h1>
        <p className="text-sm text-muted-foreground">{player.phone}</p>
      </div>

      <EditPlayerForm player={player} />

      <Separator />

      <div className="space-y-3">
        <h2 className="font-semibold">Estatísticas retroativas</h2>
        <p className="text-xs text-muted-foreground">
          Lançamentos manuais de gols e assistências de temporadas anteriores.
        </p>

        {stats.length > 0 && (
          <div className="space-y-1">
            {stats.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-muted-foreground">{s.year}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {s.goals} gol{s.goals !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline">
                    {s.assists} assist{s.assists !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <RetroactiveStatForm playerId={player.id} />
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="font-semibold">Situação do jogador</h2>
        <PlayerSituationForm
          playerId={player.id}
          isBanned={player.is_banned}
          suspendedUntil={player.suspended_until}
          suspensionReason={player.suspension_reason}
        />
      </div>
    </div>
  );
}
