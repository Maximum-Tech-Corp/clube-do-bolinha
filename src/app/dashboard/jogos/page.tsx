import Link from 'next/link';
import { listGames } from '@/actions/games-admin';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';
import { GamesTabs } from '@/components/dashboard/games-tabs';

export default async function JogosPage() {
  const { upcoming, past } = await listGames();

  return (
    <>
      <AdminPageHeader title="Jogos" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex justify-end">
          <Link
            href="/dashboard/jogos/novo"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Novo jogo
          </Link>
        </div>

        <GamesTabs upcoming={upcoming} past={past} />
      </div>
    </>
  );
}
