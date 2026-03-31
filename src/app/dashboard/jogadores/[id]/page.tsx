import { notFound } from 'next/navigation';
import { getPlayer, getPlayerStats } from '@/actions/players-admin';
import { EditPlayerForm } from '@/components/dashboard/edit-player-form';
import { RetroactiveStatForm } from '@/components/dashboard/retroactive-stat-form';
import { PlayerSituationForm } from '@/components/dashboard/player-situation-form';
import { Separator } from '@/components/ui/separator';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
    <>
      <AdminPageHeader title={player.name} backHref="/dashboard/jogadores" />
      <div className="max-w-md mx-auto p-4">
        <Tabs defaultValue="dados" className="w-full">
          <TabsList variant="line" className="w-full mb-6">
            <TabsTrigger value="dados" className="flex-1">
              Dados do jogador
            </TabsTrigger>
            <TabsTrigger value="retroativos" className="flex-1">
              Dados retroativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6">
            <EditPlayerForm player={player} />

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
          </TabsContent>

          <TabsContent value="retroativos" className="space-y-3">
            <h2 className="font-semibold">Estatísticas retroativas</h2>
            <p className="text-xs text-muted-foreground">
              Adicione gols e assistências de temporadas/jogos anteriores.
            </p>
            <RetroactiveStatForm playerId={player.id} stats={stats} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
