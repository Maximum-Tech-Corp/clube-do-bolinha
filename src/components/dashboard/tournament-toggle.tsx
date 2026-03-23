'use client';

import { useState, useTransition } from 'react';
import { toggleTournament } from '@/actions/games-admin';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  gameId: string;
  isTournament: boolean;
}

export function TournamentToggle({ gameId, isTournament: initial }: Props) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(value: boolean) {
    setError(null);
    setEnabled(value);
    startTransition(async () => {
      const result = await toggleTournament(gameId, value);
      if (result.error) {
        setError(result.error);
        setEnabled(!value); // reverte visualmente
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Switch
          id="tournament-toggle"
          checked={enabled}
          onCheckedChange={handleChange}
          disabled={pending}
        />
        <Label htmlFor="tournament-toggle" className="cursor-pointer">
          Modo campeonato
        </Label>
        {pending && (
          <span className="text-xs text-muted-foreground">Salvando...</span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
