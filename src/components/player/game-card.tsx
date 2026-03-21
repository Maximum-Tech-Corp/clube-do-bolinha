"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmPresenceDialog } from "./confirm-presence-dialog";

interface GameData {
  id: string;
  location: string | null;
  scheduled_at: string;
  status: string;
  is_tournament: boolean;
  draw_done: boolean;
}

interface Props {
  game: GameData;
  teamId: string;
  teamCode: string;
  confirmedCount: number;
  playerStatus: string | null;
  defaultPhone?: string;
}

export function GameCard({
  game,
  teamId,
  teamCode,
  confirmedCount,
  playerStatus,
  defaultPhone,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const date = new Date(game.scheduled_at);
  const dateStr = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
  const timeStr = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCancelled = game.status === "cancelled";
  const isFinished = game.status === "finished";
  const isOpen = game.status === "open";

  function getPlayerStatusLabel() {
    if (playerStatus === "confirmed") return "✓ Confirmado";
    if (playerStatus === "waitlist") return "Na fila de espera";
    return null;
  }

  const playerStatusLabel = getPlayerStatusLabel();

  return (
    <>
      <Card className={isCancelled ? "opacity-60" : ""}>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="font-semibold capitalize">{dateStr}</p>
              <p className="text-sm text-muted-foreground">{timeStr}</p>
              {game.location && (
                <p className="text-sm text-muted-foreground">{game.location}</p>
              )}
              {game.is_tournament && !isCancelled && (
                <p className="text-xs text-primary font-medium">Modo Campeonato</p>
              )}
            </div>
            <div className="shrink-0">
              {isCancelled && (
                <span className="text-xs font-medium text-destructive border border-destructive rounded px-2 py-0.5">
                  Cancelado
                </span>
              )}
              {isFinished && (
                <span className="text-xs font-medium text-muted-foreground border border-border rounded px-2 py-0.5">
                  Finalizado
                </span>
              )}
              {isOpen && (
                <span className="text-xs font-medium text-primary border border-primary/40 bg-primary/5 rounded px-2 py-0.5">
                  Agendado
                </span>
              )}
            </div>
          </div>

          {!isCancelled && !isFinished && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {confirmedCount} confirmado{confirmedCount !== 1 ? "s" : ""}
              </p>
              {playerStatusLabel ? (
                <span className="text-sm font-medium text-primary">
                  {playerStatusLabel}
                </span>
              ) : (
                isOpen && (
                  <Button size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
                    Confirmar presença
                  </Button>
                )
              )}
            </div>
          )}

          {isOpen && game.draw_done && (
            <Link
              href={`/jogador/${teamCode}/times/${game.id}`}
              className="block w-full text-center text-sm font-medium text-primary border border-primary/40 bg-primary/5 rounded-md py-1.5 hover:bg-primary/10 transition-colors"
            >
              Ver times sorteados
            </Link>
          )}
        </CardContent>
      </Card>

      <ConfirmPresenceDialog
        gameId={game.id}
        teamId={teamId}
        defaultPhone={defaultPhone}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
