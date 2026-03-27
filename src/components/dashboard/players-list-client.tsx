'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  attendanceRate: number | null;
  waitlistCount: number;
}

interface Props {
  players: Player[];
}

const staminaLabel: Record<string, string> = {
  '1': '1 jogo',
  '2': '2 jogos',
  '3': '3 jogos',
  '4plus': '4+ jogos',
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
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          {search.trim()
            ? 'Nenhum jogador encontrado.'
            : 'Nenhum jogador cadastrado ainda.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(player => (
            <Link
              key={player.id}
              href={`/dashboard/jogadores/${player.id}`}
              className="block"
            >
              <Card
                className={
                  player.is_banned
                    ? 'bg-red-50 ring-red-300'
                    : player.suspended_until &&
                        new Date(player.suspended_until) > new Date()
                      ? 'bg-yellow-50 ring-yellow-300'
                      : 'hover:bg-muted/50 transition-colors'
                }
              >
                <CardContent className="py-3 px-4">
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
                        {!player.is_banned &&
                          player.suspended_until &&
                          new Date(player.suspended_until) > new Date() && (
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
                        {player.phone} · {player.weight_kg} kg ·{' '}
                        {staminaLabel[player.stamina]}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div>
                        <p className="text-sm font-medium">
                          {player.attendanceRate !== null
                            ? `${player.attendanceRate}%`
                            : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          participação
                        </p>
                      </div>
                      {player.waitlistCount > 0 && (
                        <div>
                          <p className="text-sm font-medium text-orange-600">
                            {player.waitlistCount}x
                          </p>
                          <p className="text-xs text-muted-foreground">
                            fila de espera
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
