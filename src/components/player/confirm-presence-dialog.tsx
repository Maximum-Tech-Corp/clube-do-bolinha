'use client';

import { useEffect, useState } from 'react';
import { confirmPresence } from '@/actions/player';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Step =
  | 'confirming'
  | 'waitlist_offer'
  | 'confirmed'
  | 'waitlisted'
  | 'already_confirmed'
  | 'banned'
  | 'suspended'
  | 'error';

interface Props {
  gameId: string;
  teamId: string;
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmPresenceDialog({
  gameId,
  teamId,
  phone,
  open,
  onOpenChange,
}: Props) {
  const [step, setStep] = useState<Step>('confirming');
  const [serverError, setServerError] = useState<string | null>(null);
  const [suspensionInfo, setSuspensionInfo] = useState<{
    until: string;
    reason: string | null;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmPresence({ gameId, teamId, phone }).then(result => {
      if ('error' in result) {
        setServerError(result.error);
        setStep('error');
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
        setServerError('Jogador não encontrado nesta turma.');
        setStep('error');
        return;
      }
      if ('gameFull' in result) {
        setStep('waitlist_offer');
        return;
      }
      if ('alreadyConfirmed' in result) {
        setStep('already_confirmed');
        return;
      }
      setStep(result.status === 'confirmed' ? 'confirmed' : 'waitlisted');
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onJoinWaitlist() {
    setServerError(null);
    const result = await confirmPresence({
      gameId,
      teamId,
      phone,
      joinWaitlist: true,
    });
    if ('error' in result) {
      setServerError(result.error);
      return;
    }
    setStep('waitlisted');
  }

  function handleDialogOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setStep('confirming');
      setServerError(null);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-sm">
        {step === 'confirming' && (
          <DialogHeader>
            <DialogTitle>Confirmando...</DialogTitle>
            <DialogDescription>Aguarde um momento.</DialogDescription>
          </DialogHeader>
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
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
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
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
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
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
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
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
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </>
        )}

        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>Erro</DialogTitle>
              <DialogDescription>
                {serverError ?? 'Algo deu errado. Tente novamente.'}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
