"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeDraw } from "@/actions/draw";
import { getDrawInfo } from "@/lib/draw-algorithm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  gameId: string;
  confirmedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrawModal({ gameId, confirmedCount, open, onOpenChange }: Props) {
  const [isTournament, setIsTournament] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const info = getDrawInfo(confirmedCount);

  function handleClose(value: boolean) {
    if (!value) {
      setError(null);
      setIsTournament(false);
    }
    onOpenChange(value);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await executeDraw(gameId, isTournament);
      if (result.error) {
        setError(result.error);
        return;
      }
      handleClose(false);
      router.push(`/dashboard/jogos/${gameId}/times`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar sorteio</DialogTitle>
          <DialogDescription>
            Revise as informações antes de sortear. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do jogo */}
        <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jogadores confirmados</span>
            <span className="font-medium">{confirmedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Times completos</span>
            <span className="font-medium">
              {info.completeTeams} × {5} jogadores
            </span>
          </div>
          {info.hasPartialTeam && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time incompleto</span>
              <span className="font-medium">{info.leftover} jogadores</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de times</span>
            <span className="font-medium">{info.nTeams}</span>
          </div>
        </div>

        {/* Aviso de time incompleto */}
        {info.isWarning && info.message && (
          <p className="text-sm text-yellow-600">{info.message}</p>
        )}

        {/* Checkbox campeonato */}
        <label
          className={`flex items-start gap-3 rounded-lg border border-border p-3 ${
            !info.canBeTournament ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 shrink-0"
            checked={isTournament}
            disabled={!info.canBeTournament}
            onChange={(e) => setIsTournament(e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium">Modo campeonato</p>
            <p className="text-xs text-muted-foreground">
              {info.canBeTournament
                ? "Gera chaveamento entre os times após o sorteio."
                : "Disponível apenas quando o sorteio resultar em 4 ou 5 times."}
            </p>
          </div>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Sorteando..." : "Confirmar e Sortear"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleClose(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
