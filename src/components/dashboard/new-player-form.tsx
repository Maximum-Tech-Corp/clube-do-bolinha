'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import { createPlayer } from '@/actions/players-admin';
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

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  phone: z.string().min(10, 'Informe um celular válido'),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(['1', '2', '3', '4plus'] as const),
  position: z.enum(['zagueiro', 'atacante', 'libero']).nullable(),
  is_star: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function NewPlayerForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      position: null,
      is_star: false,
    },
  });

  const isStar = useWatch({ control, name: 'is_star' });
  const stamina = useWatch({ control, name: 'stamina' });
  const position = useWatch({ control, name: 'position' });

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhoneDisplay(formatPhone(digits));
    setValue('phone', digits, { shouldValidate: true });
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await createPlayer({
      name: data.name,
      phone: data.phone,
      weight_kg: data.weight_kg,
      stamina: data.stamina as StaminaLevel,
      position: data.position,
      is_star: data.is_star,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    router.push('/dashboard/jogadores');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Nome ou apelido"
          className="h-auto py-2 border-gray-300"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Celular</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(11) 99999-9999"
          className="h-auto py-2 border-gray-300"
          value={phoneDisplay}
          onChange={handlePhoneChange}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="weight_kg">Peso médio (kg)</Label>
        <Input
          id="weight_kg"
          type="number"
          placeholder="75"
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
            value={stamina ?? ''}
            onValueChange={v => setValue('stamina', v as StaminaLevel)}
          >
            <SelectTrigger className="h-auto! py-2 border-gray-300 w-full">
              <SelectValue placeholder="Selecione" />
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
          {errors.stamina && (
            <p className="text-sm text-destructive">{errors.stamina.message}</p>
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

      <Button type="submit" className="w-full py-5" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Cadastrar jogador'}
      </Button>
    </form>
  );
}
