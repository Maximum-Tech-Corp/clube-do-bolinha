import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function HistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();

  const { data: admin } = await service
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!admin) redirect('/login');

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', admin.id)
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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Histórico</h1>

      {finishedGames.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum jogo finalizado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {finishedGames.map(game => (
            <li key={game.id}>
              <Link
                href={`/dashboard/historico/${game.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(game.scheduled_at)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {game.location ?? 'Local não definido'}
                  </p>
                </div>
                {game.is_tournament && (
                  <Badge variant="secondary" className="shrink-0">
                    Campeonato
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
