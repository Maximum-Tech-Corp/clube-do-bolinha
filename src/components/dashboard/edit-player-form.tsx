'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { updatePlayer } from '@/actions/players-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaminaLevel, PlayerPosition } from '@/types/database.types';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(['1', '2', '3', '4plus'] as const),
  position: z.enum(['zagueiro', 'atacante', 'libero']).nullable(),
  is_star: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Player {
  id: string;
  name: string;
  phone: string;
  weight_kg: number;
  stamina: string;
  position: PlayerPosition | null;
  is_star: boolean;
}

export function EditPlayerForm({ player }: { player: Player }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
      stamina: player.stamina as StaminaLevel,
      position: player.position,
      is_star: player.is_star,
    },
  });

  const isStar = useWatch({ control, name: 'is_star' });
  const position = useWatch({ control, name: 'position' });
  const stamina = useWatch({ control, name: 'stamina' });

  async function onSubmit(data: FormData) {
    setServerError(null);
    setSaved(false);
    const result = await updatePlayer(player.id, {
      name: data.name,
      weight_kg: data.weight_kg,
      stamina: data.stamina as StaminaLevel,
      position: data.position,
      is_star: data.is_star,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSaved(true);
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
          value={player.phone}
          disabled
          className="h-auto py-2 border-gray-300"
        />
        <p className="text-xs text-muted-foreground">
          O telefone não pode ser alterado.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="weight_kg">Peso médio (kg)</Label>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Resistência</Label>
          <Select
            value={stamina}
            onValueChange={v => setValue('stamina', v as StaminaLevel)}
          >
            <SelectTrigger className="h-auto! py-2 border-gray-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="py-2">
                1 jogo
              </SelectItem>
              <SelectItem value="2" className="py-2">
                2 jogos
              </SelectItem>
              <SelectItem value="3" className="py-2">
                3 jogos
              </SelectItem>
              <SelectItem value="4plus" className="py-2">
                4 ou mais jogos
              </SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_star"
          checked={isStar}
          onCheckedChange={v => setValue('is_star', v)}
        />
        <Label htmlFor="is_star">Jogador destaque ⭐</Label>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {saved && (
        <p className="text-sm text-green-600">Dados salvos com sucesso!</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>
  );
}
