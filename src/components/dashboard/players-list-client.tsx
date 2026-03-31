'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Player {
  id: string;
  name: string;
  phone: string;
  weight_kg: number;
  stamina: string;
  is_star: boolean;
  is_banned: boolean;
  suspended_until: string | null;
  confirmedCount: number;
  waitlistCount: number;
}

interface Props {
  players: Player[];
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const staminaLabel: Record<string, string> = {
  '1': 'nível 1',
  '2': 'nível 2',
  '3': 'nível 3',
  '4plus': 'nível 4+',
};

export function PlayersListClient({ players }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? players.filter(p =>
        p.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : players;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-auto py-2 border-gray-300"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          {search.trim()
            ? 'Nenhum jogador encontrado.'
            : 'Nenhum jogador cadastrado ainda.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(player => {
            const isSuspended =
              !player.is_banned &&
              !!player.suspended_until &&
              new Date(player.suspended_until) > new Date();

            const cardBg = player.is_banned
              ? 'bg-red-50'
              : isSuspended
                ? 'bg-yellow-50'
                : 'bg-gray-50';

            return (
              <Link
                key={player.id}
                href={`/dashboard/jogadores/${player.id}`}
                className="block"
              >
                <div
                  data-testid="player-card"
                  className={`rounded-lg shadow-md ${cardBg} px-3 py-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {player.name}
                        </span>
                        {player.is_banned && (
                          <Badge variant="destructive" className="shrink-0">
                            Banido
                          </Badge>
                        )}
                        {isSuspended && (
                          <Badge className="shrink-0 bg-yellow-100 text-yellow-700 border-transparent">
                            Suspenso
                          </Badge>
                        )}
                        {player.is_star && (
                          <Badge variant="secondary" className="shrink-0">
                            ⭐ Destaque
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(player.phone)} · {player.weight_kg} kg ·{' '}
                        {staminaLabel[player.stamina]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {player.confirmedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        participações em jogos
                      </p>
                      {player.waitlistCount > 0 && (
                        <p className="text-xs text-red-400">
                          (e {player.waitlistCount}x na fila de espera)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
