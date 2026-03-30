import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

function formatDate(iso: string) {
  const formatted = new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default async function HistoricoPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();
  if (!team) redirect('/login');

  const { data: games } = await service
    .from('games')
    .select('id, location, scheduled_at, is_tournament, finished_at')
    .eq('team_id', team.id)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false, nullsFirst: false });

  const finishedGames = games ?? [];

  return (
    <>
      <AdminPageHeader title="Histórico" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {finishedGames.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum jogo finalizado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {finishedGames.map(game => (
              <Link
                key={game.id}
                href={`/dashboard/historico/${game.id}`}
                className="flex items-center justify-between gap-2 rounded-lg shadow-md bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(game.scheduled_at)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {game.location ?? 'Local não definido'}
                    {game.is_tournament && ' · Campeonato'}
                    {' · Finalizado'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
