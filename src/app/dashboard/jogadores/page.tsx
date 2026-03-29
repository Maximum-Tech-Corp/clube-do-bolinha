import Link from 'next/link';
import { listPlayers } from '@/actions/players-admin';
import { PlayersListClient } from '@/components/dashboard/players-list-client';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

export default async function JogadoresPage() {
  const { players, error } = await listPlayers();

  return (
    <>
      <AdminPageHeader title="Jogadores" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {players.length} jogador{players.length !== 1 ? 'es' : ''}{' '}
            cadastrado
            {players.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/dashboard/jogadores/novo"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 h-9 text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Adicionar jogador
          </Link>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <PlayersListClient players={players} />
      </div>
    </>
  );
}
