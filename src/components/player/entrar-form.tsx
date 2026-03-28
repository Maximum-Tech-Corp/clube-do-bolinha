'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { identifyPlayer, registerPlayer } from '@/actions/player';
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

type Step = 'phone' | 'register' | 'banned' | 'suspended';

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const phoneSchema = z.object({
  phone: z
    .string()
    .transform(v => v.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Informe um celular válido')),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(['1', '2', '3', '4plus'] as const),
});

type PhoneData = z.infer<typeof phoneSchema>;
type RegisterData = z.infer<typeof registerSchema>;

interface Props {
  teamId: string;
  teamCode: string;
}

export function EntrarForm({ teamId, teamCode }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [suspensionInfo, setSuspensionInfo] = useState<{
    until: string;
    reason: string | null;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const phoneForm = useForm<PhoneData>({
    resolver: zodResolver(phoneSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  async function onPhoneSubmit(data: PhoneData) {
    setServerError(null);
    const result = await identifyPlayer({ teamId, phone: data.phone });

    if ('error' in result) {
      setServerError(result.error);
      return;
    }
    if ('banned' in result) {
      setStep('banned');
      return;
    }
    if ('suspended' in result) {
      setSuspensionInfo({ until: result.until, reason: result.reason });
      setStep('suspended');
      return;
    }
    if ('needsRegistration' in result) {
      setPhone(data.phone);
      setStep('register');
      return;
    }

    router.push(`/jogador/${teamCode}`);
  }

  async function onRegisterSubmit(data: RegisterData) {
    setServerError(null);
    const result = await registerPlayer({
      teamId,
      phone,
      name: data.name,
      weight_kg: data.weight_kg,
      stamina: data.stamina as StaminaLevel,
    });

    if ('error' in result) {
      setServerError(result.error);
      return;
    }

    router.push(`/jogador/${teamCode}`);
  }

  if (step === 'banned') {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
        <p className="font-semibold text-destructive">Acesso bloqueado</p>
        <p className="text-muted-foreground">
          Você foi banido desta turma. Em caso de dúvidas, entre em contato com
          o organizador.
        </p>
      </div>
    );
  }

  if (step === 'suspended' && suspensionInfo) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
        <p className="font-semibold text-destructive">
          Suspenso até{' '}
          {new Date(suspensionInfo.until).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
        {suspensionInfo.reason && (
          <p className="text-muted-foreground">{suspensionInfo.reason}</p>
        )}
        <p className="text-muted-foreground">
          Você não pode acessar durante este período.
        </p>
      </div>
    );
  }

  if (step === 'register') {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="font-semibold text-sm">Primeiro acesso</p>
          <p className="text-sm text-muted-foreground">
            Número não encontrado na turma. Preencha seus dados para entrar.
          </p>
        </div>
        <form
          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="name">Nome ou apelido</Label>
            <Input
              id="name"
              placeholder="Como te chamam na pelada"
              className="h-auto py-2 border-gray-300"
              {...registerForm.register('name')}
            />
            {registerForm.formState.errors.name && (
              <p className="text-sm text-destructive">
                {registerForm.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="weight_kg">Peso (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              placeholder="75"
              className="h-auto py-2 border-gray-300"
              {...registerForm.register('weight_kg', { valueAsNumber: true })}
            />
            {registerForm.formState.errors.weight_kg && (
              <p className="text-sm text-destructive">
                {registerForm.formState.errors.weight_kg.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Resistência — quantos jogos você aguenta seguidos?</Label>
            <Select
              onValueChange={v =>
                registerForm.setValue('stamina', v as StaminaLevel)
              }
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 jogo</SelectItem>
                <SelectItem value="2">2 jogos</SelectItem>
                <SelectItem value="3">3 jogos</SelectItem>
                <SelectItem value="4plus">4 ou mais jogos</SelectItem>
              </SelectContent>
            </Select>
            {registerForm.formState.errors.stamina && (
              <p className="text-sm text-destructive">
                {registerForm.formState.errors.stamina.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button
            type="submit"
            className="w-full py-5"
            disabled={registerForm.formState.isSubmitting}
          >
            {registerForm.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="phone">Seu número de celular</Label>
        <Controller
          control={phoneForm.control}
          name="phone"
          render={({ field }) => (
            <Input
              id="phone"
              type="tel"
              placeholder="(85) 98725-7171"
              className="h-auto py-2 border-gray-300"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
              onChange={e => field.onChange(applyPhoneMask(e.target.value))}
            />
          )}
        />
        {phoneForm.formState.errors.phone && (
          <p className="text-sm text-destructive">
            {phoneForm.formState.errors.phone.message}
          </p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button
        type="submit"
        className="w-full py-5"
        disabled={phoneForm.formState.isSubmitting}
      >
        {phoneForm.formState.isSubmitting ? 'Verificando...' : 'Entrar'}
      </Button>
    </form>
  );
}
