'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { confirmPresence } from '@/actions/player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaminaLevel } from '@/types/database.types';

type Step =
  | 'phone'
  | 'register'
  | 'waitlist_offer'
  | 'confirmed'
  | 'waitlisted'
  | 'already_confirmed'
  | 'banned'
  | 'suspended';

const phoneSchema = z.object({
  phone: z.string().min(10, 'Informe um celular válido'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(['1', '2', '3', '4plus'] as const),
});

type PhoneData = z.infer<typeof phoneSchema>;
type RegisterData = z.infer<typeof registerSchema>;

interface Props {
  gameId: string;
  teamId: string;
  defaultPhone?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmPresenceDialog({
  gameId,
  teamId,
  defaultPhone,
  open,
  onOpenChange,
}: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [pendingNewPlayer, setPendingNewPlayer] = useState<RegisterData | null>(
    null,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [suspensionInfo, setSuspensionInfo] = useState<{
    until: string;
    reason: string | null;
  } | null>(null);

  const phoneForm = useForm<PhoneData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: defaultPhone ?? '' },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  function handleClose(open: boolean) {
    if (!open) {
      setStep('phone');
      setServerError(null);
      phoneForm.reset({ phone: defaultPhone ?? '' });
      registerForm.reset();
    }
    onOpenChange(open);
  }

  async function onPhoneSubmit(data: PhoneData) {
    setServerError(null);
    setPhone(data.phone);
    const result = await confirmPresence({ gameId, teamId, phone: data.phone });

    if ('error' in result) return setServerError(result.error);
    if ('banned' in result) return setStep('banned');
    if ('suspended' in result) {
      setSuspensionInfo({ until: result.until, reason: result.reason });
      return setStep('suspended');
    }
    if ('needsRegistration' in result) return setStep('register');
    if ('gameFull' in result) return setStep('waitlist_offer');
    if ('alreadyConfirmed' in result) return setStep('already_confirmed');
    setStep(result.status === 'confirmed' ? 'confirmed' : 'waitlisted');
  }

  async function onRegisterSubmit(data: RegisterData) {
    setServerError(null);
    setPendingNewPlayer(data);
    const result = await confirmPresence({
      gameId,
      teamId,
      phone,
      newPlayer: {
        name: data.name,
        weight_kg: data.weight_kg,
        stamina: data.stamina as StaminaLevel,
      },
    });

    if ('error' in result) return setServerError(result.error);
    if ('banned' in result) return setStep('banned');
    if ('suspended' in result) {
      setSuspensionInfo({ until: result.until, reason: result.reason });
      return setStep('suspended');
    }
    if ('needsRegistration' in result) return;
    if ('gameFull' in result) return setStep('waitlist_offer');
    if ('alreadyConfirmed' in result) return setStep('already_confirmed');
    setStep(result.status === 'confirmed' ? 'confirmed' : 'waitlisted');
  }

  async function onJoinWaitlist() {
    setServerError(null);
    const result = await confirmPresence({
      gameId,
      teamId,
      phone,
      newPlayer: pendingNewPlayer
        ? {
            name: pendingNewPlayer.name,
            weight_kg: pendingNewPlayer.weight_kg,
            stamina: pendingNewPlayer.stamina as StaminaLevel,
          }
        : undefined,
      joinWaitlist: true,
    });

    if ('error' in result) return setServerError(result.error);
    if ('banned' in result) return setStep('banned');
    if ('suspended' in result) {
      setSuspensionInfo({ until: result.until, reason: result.reason });
      return setStep('suspended');
    }
    if ('needsRegistration' in result) return;
    if ('gameFull' in result) return;
    if ('alreadyConfirmed' in result) return setStep('already_confirmed');
    setStep('waitlisted');
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        {step === 'phone' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar presença</DialogTitle>
              <DialogDescription>
                Informe seu número de celular para confirmar
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="phone">Celular</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  {...phoneForm.register('phone')}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={phoneForm.formState.isSubmitting}
              >
                {phoneForm.formState.isSubmitting
                  ? 'Verificando...'
                  : 'Confirmar'}
              </Button>
            </form>
          </>
        )}

        {step === 'register' && (
          <>
            <DialogHeader>
              <DialogTitle>Primeiro acesso</DialogTitle>
              <DialogDescription>
                Parece que é sua primeira vez. Preencha seus dados.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome ou apelido"
                  {...registerForm.register('name')}
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="weight_kg">Peso médio (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  placeholder="75"
                  {...registerForm.register('weight_kg', {
                    valueAsNumber: true,
                  })}
                />
                {registerForm.formState.errors.weight_kg && (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.weight_kg.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>
                  Resistência — quantos jogos você aguenta seguidos?
                </Label>
                <Select
                  onValueChange={v =>
                    registerForm.setValue('stamina', v as StaminaLevel)
                  }
                >
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
                className="w-full"
                disabled={registerForm.formState.isSubmitting}
              >
                {registerForm.formState.isSubmitting
                  ? 'Salvando...'
                  : 'Confirmar presença'}
              </Button>
            </form>
          </>
        )}

        {step === 'waitlist_offer' && (
          <>
            <DialogHeader>
              <DialogTitle>Jogo lotado</DialogTitle>
              <DialogDescription>
                As 25 vagas já foram preenchidas. Deseja entrar na lista de
                espera?
              </DialogDescription>
            </DialogHeader>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={onJoinWaitlist}>
                Entrar na lista de espera
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
            </div>
          </>
        )}

        {step === 'confirmed' && (
          <>
            <DialogHeader>
              <DialogTitle>Presença confirmada!</DialogTitle>
              <DialogDescription>
                Você está confirmado neste jogo. Até lá!
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </>
        )}

        {step === 'waitlisted' && (
          <>
            <DialogHeader>
              <DialogTitle>Na lista de espera</DialogTitle>
              <DialogDescription>
                Você está na fila de espera. Avisaremos caso abra uma vaga.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </>
        )}

        {step === 'already_confirmed' && (
          <>
            <DialogHeader>
              <DialogTitle>Você já confirmou!</DialogTitle>
              <DialogDescription>
                Sua presença neste jogo já foi registrada.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </>
        )}

        {step === 'banned' && (
          <>
            <DialogHeader>
              <DialogTitle>Acesso bloqueado</DialogTitle>
              <DialogDescription>
                Você foi banido desta turma e não pode confirmar presença. Em
                caso de dúvidas, entre em contato com o organizador.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </>
        )}

        {step === 'suspended' && suspensionInfo && (
          <>
            <DialogHeader>
              <DialogTitle>Jogador suspenso</DialogTitle>
              <DialogDescription>
                Você está suspenso até{' '}
                {new Date(suspensionInfo.until).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
                {suspensionInfo.reason && `: ${suspensionInfo.reason}`}.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
