"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Player {
  id: string;
  name: string;
  phone: string;
  weight_kg: number;
  stamina: string;
  is_star: boolean;
  attendanceRate: number | null;
}

interface Props {
  players: Player[];
}

const staminaLabel: Record<string, string> = {
  "1": "1 jogo",
  "2": "2 jogos",
  "3": "3 jogos",
  "4plus": "4+ jogos",
};

export function PlayersListClient({ players }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? players.filter((p) =>
        p.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : players;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          {search.trim() ? "Nenhum jogador encontrado." : "Nenhum jogador cadastrado ainda."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((player) => (
            <Link
              key={player.id}
              href={`/dashboard/jogadores/${player.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{player.name}</span>
                        {player.is_star && (
                          <Badge variant="secondary" className="shrink-0">
                            ⭐ Destaque
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {player.phone} · {player.weight_kg} kg ·{" "}
                        {staminaLabel[player.stamina]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {player.attendanceRate !== null
                          ? `${player.attendanceRate}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">participação</p>
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
