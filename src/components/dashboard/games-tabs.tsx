'use client';

import Link from 'next/link';
import { CalendarClock, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export interface Game {
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
      className="flex items-center justify-between gap-2 rounded-lg shadow-md bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
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

interface GamesTabsProps {
  upcoming: Game[];
  past: Game[];
}

export function GamesTabs({ upcoming, past }: GamesTabsProps) {
  return (
    <Tabs defaultValue="upcoming">
      <TabsList variant="line" className="w-full border-b border-border pb-0">
        <TabsTrigger value="upcoming" className="flex-1 gap-1.5 pb-2">
          <CalendarClock className="size-4" />
          Próximos jogos
          {upcoming.length > 0 && (
            <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-medium leading-none">
              {upcoming.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="past" className="flex-1 gap-1.5 pb-2">
          <History className="size-4" />
          Jogos recentes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="mt-3 space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum jogo agendado.
          </p>
        ) : (
          upcoming.map(g => <GameRow key={g.id} game={g} />)
        )}
      </TabsContent>

      <TabsContent value="past" className="mt-3 space-y-2">
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum jogo no histórico.
          </p>
        ) : (
          past.map(g => <GameRow key={g.id} game={g} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
