'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { addRetroactiveStat, deleteRetroactiveStat } from '@/actions/players-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const schema = z.object({
  year: z.number().min(2000).max(2100),
  goals: z.number().min(0),
  assists: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface Stat {
  id: string;
  year: number;
  goals: number;
  assists: number;
}

interface Props {
  playerId: string;
  stats?: Stat[];
}

export function RetroactiveStatForm({ playerId, stats = [] }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: new Date().getFullYear() - 1,
      goals: 0,
      assists: 0,
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await addRetroactiveStat({
      playerId,
      year: data.year,
      goals: data.goals,
      assists: data.assists,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    reset({ year: new Date().getFullYear() - 1, goals: 0, assists: 0 });
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    await deleteRetroactiveStat(pendingDeleteId);
    setDeleting(false);
    setPendingDeleteId(null);
    router.refresh();
  }

  return (
    <>
      <Dialog
        open={!!pendingDeleteId}
        onOpenChange={open => !open && setPendingDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover lançamento?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {stats.length > 0 && (
        <div className="space-y-1">
          {stats.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between text-sm py-1"
            >
              <button
                type="button"
                aria-label="Remover lançamento"
                className="text-destructive font-bold mr-2 hover:opacity-70"
                onClick={() => setPendingDeleteId(s.id)}
              >
                <X size={16} strokeWidth={3} />
              </button>
              <span className="text-muted-foreground flex-1">{s.year}</span>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {s.goals} gol{s.goals !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {s.assists} assist{s.assists !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="year">Ano</Label>
            <Input
              id="year"
              type="number"
              {...register('year', { valueAsNumber: true })}
            />
            {errors.year && (
              <p className="text-xs text-destructive">{errors.year.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="goals">Gols</Label>
            <Input
              id="goals"
              type="number"
              min={0}
              {...register('goals', { valueAsNumber: true })}
            />
            {errors.goals && (
              <p className="text-xs text-destructive">{errors.goals.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="assists">Assists</Label>
            <Input
              id="assists"
              type="number"
              min={0}
              {...register('assists', { valueAsNumber: true })}
            />
            {errors.assists && (
              <p className="text-xs text-destructive">
                {errors.assists.message}
              </p>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? 'Salvando...' : 'Adicionar'}
        </Button>
      </form>
    </>
  );
}
