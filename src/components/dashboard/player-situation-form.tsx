'use client';

import { useState, useTransition } from 'react';
import {
  banPlayer,
  unbanPlayer,
  suspendPlayer,
  removeSuspension,
} from '@/actions/players-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  playerId: string;
  isBanned: boolean;
  suspendedUntil: string | null;
  suspensionReason: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PlayerSituationForm({
  playerId,
  isBanned,
  suspendedUntil,
  suspensionReason,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Suspensão ainda ativa?
  const isActivelySuspended =
    !!suspendedUntil && new Date(suspendedUntil) > new Date();

  // Form de nova suspensão
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendDate, setSuspendDate] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  function handleBanToggle() {
    setError(null);
    startTransition(async () => {
      const result = isBanned
        ? await unbanPlayer(playerId)
        : await banPlayer(playerId);
      if (result.error) setError(result.error);
    });
  }

  function handleRemoveSuspension() {
    setError(null);
    startTransition(async () => {
      const result = await removeSuspension(playerId);
      if (result.error) setError(result.error);
    });
  }

  function handleSuspend() {
    if (!suspendDate) return;
    setError(null);
    startTransition(async () => {
      // Usa o fim do dia selecionado
      const result = await suspendPlayer(
        playerId,
        `${suspendDate}T23:59:59.999Z`,
        suspendReason,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowSuspendForm(false);
      setSuspendDate('');
      setSuspendReason('');
    });
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Status atual */}
      {(isBanned || isActivelySuspended) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-1 text-sm">
          {isBanned && (
            <p className="font-medium text-destructive">Jogador banido</p>
          )}
          {isActivelySuspended && (
            <>
              <p className="font-medium text-destructive">
                Suspenso até {formatDate(suspendedUntil!)}
              </p>
              {suspensionReason && (
                <p className="text-muted-foreground">{suspensionReason}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Banimento */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Banimento permanente</p>
          <p className="text-xs text-muted-foreground">
            Jogador não poderá confirmar presença em nenhum jogo.
          </p>
        </div>
        <Button
          variant={isBanned ? 'outline' : 'destructive'}
          size="sm"
          onClick={handleBanToggle}
          disabled={pending}
        >
          {isBanned ? 'Remover banimento' : 'Banir'}
        </Button>
      </div>

      {/* Suspensão */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Suspensão temporária</p>
            <p className="text-xs text-muted-foreground">
              Bloqueado até uma data específica.
            </p>
          </div>
          {isActivelySuspended ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveSuspension}
              disabled={pending}
            >
              Remover
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuspendForm(v => !v)}
              disabled={pending}
            >
              {showSuspendForm ? 'Cancelar' : 'Suspender'}
            </Button>
          )}
        </div>

        {showSuspendForm && !isActivelySuspended && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-1">
              <Label htmlFor="suspend-date">Suspenso até</Label>
              <Input
                id="suspend-date"
                type="date"
                min={today}
                value={suspendDate}
                onChange={e => setSuspendDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="suspend-reason">
                Motivo{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional, até 100 caracteres)
                </span>
              </Label>
              <Input
                id="suspend-reason"
                maxLength={100}
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="ex: conduta inadequada"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSuspend}
              disabled={pending || !suspendDate}
            >
              {pending ? 'Salvando...' : 'Confirmar suspensão'}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
