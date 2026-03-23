'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlayer } from '@/actions/players-admin';
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
import type { StaminaLevel } from '@/types/database.types';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  phone: z.string().min(10, 'Informe um celular válido'),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(['1', '2', '3', '4plus'] as const),
});

type FormData = z.infer<typeof schema>;

export function NewPlayerForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await createPlayer({
      name: data.name,
      phone: data.phone,
      weight_kg: data.weight_kg,
      stamina: data.stamina as StaminaLevel,
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
        <Input id="name" placeholder="Nome ou apelido" {...register('name')} />
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
          {...register('phone')}
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
          {...register('weight_kg', { valueAsNumber: true })}
        />
        {errors.weight_kg && (
          <p className="text-sm text-destructive">{errors.weight_kg.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Resistência — quantos jogos aguenta seguidos?</Label>
        <Select onValueChange={v => setValue('stamina', v as StaminaLevel)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 jogo</SelectItem>
            <SelectItem value="2">2 jogos</SelectItem>
            <SelectItem value="3">3 jogos</SelectItem>
            <SelectItem value="4plus">4 ou mais jogos</SelectItem>
          </SelectContent>
        </Select>
        {errors.stamina && (
          <p className="text-sm text-destructive">{errors.stamina.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Cadastrar jogador'}
      </Button>
    </form>
  );
}
