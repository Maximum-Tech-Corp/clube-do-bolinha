'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { updatePlayerSelf } from '@/actions/player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaminaLevel, PlayerPosition } from '@/types/database.types';

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  weight_kg: z.number().min(30).max(250),
  position: z.enum(['zagueiro', 'atacante', 'libero']).nullable(),
});

type FormData = z.infer<typeof schema>;

interface Player {
  name: string;
  phone: string;
  weight_kg: number;
  stamina: string;
  position: PlayerPosition | null;
  is_star: boolean;
}


interface Props {
  player: Player;
  teamId: string;
}

export function PlayerSelfEditForm({ player, teamId }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: player.name,
      weight_kg: player.weight_kg,
      position: player.position,
    },
  });

  const position = useWatch({ control, name: 'position' });

  async function onSubmit(data: FormData) {
    const result = await updatePlayerSelf(teamId, {
      name: data.name,
      weight_kg: data.weight_kg,
      stamina: player.stamina as StaminaLevel,
      position: data.position,
      is_star: player.is_star,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Dados salvos com sucesso!');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          className="h-auto py-2 border-gray-300"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Celular</Label>
        <Input
          value={formatPhone(player.phone)}
          disabled
          className="h-auto py-2 border-gray-300"
        />
        <p className="text-xs text-muted-foreground">
          O telefone não pode ser alterado.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="weight_kg">Seu peso (kg)</Label>
        <Input
          id="weight_kg"
          type="number"
          className="h-auto py-2 border-gray-300"
          {...register('weight_kg', { valueAsNumber: true })}
        />
        {errors.weight_kg && (
          <p className="text-sm text-destructive">{errors.weight_kg.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Posição</Label>
        <Select
          value={position ?? ''}
          onValueChange={v =>
            setValue('position', v === '' ? null : (v as PlayerPosition))
          }
        >
          <SelectTrigger className="h-auto! py-2 border-gray-300 w-full">
            <SelectValue placeholder="Não definida" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zagueiro" className="py-2">
              Zagueiro
            </SelectItem>
            <SelectItem value="atacante" className="py-2">
              Atacante
            </SelectItem>
            <SelectItem value="libero" className="py-2">
              Líbero
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full py-5" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>
  );
}
