'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Share2,
  Settings,
  CreditCard,
  LogOut,
  KeyRound,
  Users,
  Headphones,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTeamSettings } from '@/actions/team';
import { createBillingPortalSession } from '@/actions/stripe';
import { logout, changePassword } from '@/actions/auth';
import { sendSupportEmail } from '@/actions/support';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  appUrl: string;
  teamName: string;
  matchDurationMinutes: number;
  isCoAdmin: boolean;
}

export function DashboardMenu({
  appUrl,
  teamName,
  matchDurationMinutes,
  isCoAdmin,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [name, setName] = useState(teamName);
  const [duration, setDuration] = useState(String(matchDurationMinutes));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportType, setSupportType] = useState<'bug' | 'suggestion' | 'complaint' | 'help'>('bug');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shareText = encodeURIComponent(
    `*Clube do Bolinha*
Organize o futebol da sua turma de forma simples!

- Confirme presenca nos jogos
- Veja os times sorteados
- Acompanhe rankings e historico

Acesse: ${appUrl}

*Para instalar como app:*
Android: abra no Chrome, toque nos 3 pontos e selecione "Adicionar a tela inicial"
iPhone: abra no Safari, toque em Compartilhar e selecione "Adicionar a Tela de Inicio"`,
  );

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setPasswordError(null);
    setChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if ('error' in result) {
      setPasswordError(result.error);
    } else {
      setPasswordSaved(true);
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSaved(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    }
  }

  async function handleSendSupport() {
    if (!supportMessage.trim()) return;
    setSupportError(null);
    setSendingSupport(true);
    const result = await sendSupportEmail({ type: supportType, message: supportMessage });
    setSendingSupport(false);
    if ('error' in result) {
      setSupportError(result.error);
    } else {
      setSupportSent(true);
      setTimeout(() => {
        setSupportOpen(false);
        setSupportSent(false);
        setSupportMessage('');
        setSupportType('bug');
      }, 1500);
    }
  }

  async function handleSave() {
    const val = parseInt(duration, 10);
    if (isNaN(val) || val < 1 || !name.trim()) return;
    setSaving(true);
    await updateTeamSettings({ matchDurationMinutes: val, teamName: name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        className="p-2 rounded-lg cursor-pointer"
        aria-label="Menu"
      >
        <MoreVertical
          className="w-7 h-7"
          style={{ color: '#002776' }}
          strokeWidth={2.5}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-45 rounded-lg border border-border bg-card shadow-lg py-1">
          <button
            type="button"
            disabled={loadingPortal}
            onClick={async () => {
              setMenuOpen(false);
              setLoadingPortal(true);
              await createBillingPortalSession();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            {loadingPortal ? 'Redirecionando...' : 'Minha Assinatura'}
          </button>
          {!isCoAdmin && (
            <a
              href="/dashboard/co-admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              Defina Co-admin
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setChangePasswordOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Trocar Senha
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSupportOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Headphones className="w-4 h-4 text-muted-foreground" />
            Suporte
          </button>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            Compartilhar
          </a>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Configurações
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações da turma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome da turma</Label>
              <Input
                id="team-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Tempo das partidas (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Atualizar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changePasswordOpen}
        onOpenChange={open => {
          setChangePasswordOpen(open);
          if (!open) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError(null);
            setPasswordSaved(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || passwordSaved}
              className="w-full"
            >
              {changingPassword
                ? 'Salvando...'
                : passwordSaved
                  ? 'Senha alterada!'
                  : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={supportOpen}
        onOpenChange={open => {
          setSupportOpen(open);
          if (!open) {
            setSupportMessage('');
            setSupportType('bug');
            setSupportError(null);
            setSupportSent(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Use este canal para reportar problemas, deixar sugestões ou tirar dúvidas. Responderemos pelo seu e-mail de cadastro.
            </p>
            <div className="space-y-2">
              <Label htmlFor="support-type">Tipo</Label>
              <Select
                value={supportType}
                onValueChange={val => setSupportType(val as 'bug' | 'suggestion' | 'complaint' | 'help')}
              >
                <SelectTrigger id="support-type" className="w-full h-auto! py-2 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Reportar bug</SelectItem>
                  <SelectItem value="complaint">Reclamação</SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                  <SelectItem value="help">Ajuda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message">Mensagem</Label>
              <Textarea
                id="support-message"
                value={supportMessage}
                onChange={e => setSupportMessage(e.target.value)}
                rows={5}
              />
            </div>
            {supportError && (
              <p className="text-sm text-destructive">{supportError}</p>
            )}
            <Button
              onClick={handleSendSupport}
              disabled={sendingSupport || supportSent}
              className="w-full"
            >
              {sendingSupport
                ? 'Enviando...'
                : supportSent
                  ? 'Enviado!'
                  : 'Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
