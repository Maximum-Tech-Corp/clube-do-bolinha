import Link from 'next/link';
import { listGames } from '@/actions/games-admin';
import { Badge } from '@/components/ui/badge';

type GameStatus = 'open' | 'cancelled' | 'finished';

const statusLabel: Record<GameStatus, string> = {
  open: 'Aberto',
  cancelled: 'Cancelado',
  finished: 'Finalizado',
};

const statusVariant: Record<GameStatus, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  cancelled: 'outline',
  finished: 'secondary',
};

const statusClassName: Record<GameStatus, string> = {
  open: '',
  cancelled: 'text-muted-foreground',
  finished: '',
};

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

interface Game {
  id: string;
  location: string | null;
  scheduled_at: string;
  status: GameStatus;
  draw_done: boolean;
  is_tournament: boolean;
}

function GameRow({ game }: { game: Game }) {
  return (
    <Link
      href={`/dashboard/jogos/${game.id}`}
      className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{formatDate(game.scheduled_at)}</p>
        <p className="text-xs text-muted-foreground truncate">
          {game.location ?? 'Local não definido'}
          {game.is_tournament && ' · Campeonato'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {game.draw_done && (
          <Badge variant="secondary" className="text-xs">
            Sorteio feito
          </Badge>
        )}
        <Badge
          variant={statusVariant[game.status]}
          className={statusClassName[game.status]}
        >
          {statusLabel[game.status]}
        </Badge>
      </div>
    </Link>
  );
}

export default async function JogosPage() {
  const { upcoming, past } = await listGames();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Jogos</h1>
        <Link
          href="/dashboard/jogos/novo"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          + Novo jogo
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Próximos
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum jogo agendado.
          </p>
        ) : (
          upcoming.map(g => <GameRow key={g.id} game={g} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Histórico
        </h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum jogo no histórico.
          </p>
        ) : (
          past.map(g => <GameRow key={g.id} game={g} />)
        )}
      </section>
    </div>
  );
}
