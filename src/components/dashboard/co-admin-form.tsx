'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setCoAdmin, removeCoAdmin } from '@/actions/co-admin';

interface Props {
  initialEmail: string | null;
}

export function CoAdminForm({ initialEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleSet() {
    setError(null);
    if (!email || !password) {
      setError('Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    const result = await setCoAdmin(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleRemove() {
    setRemoving(true);
    const result = await removeCoAdmin();
    setRemoving(false);
    setConfirmOpen(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  if (initialEmail) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="co-admin-email">E-mail do co-admin</Label>
          <Input
            id="co-admin-email"
            type="email"
            value={initialEmail}
            disabled
            className="h-auto py-2 border-gray-300 bg-muted text-muted-foreground"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          variant="outline"
          className="w-full py-5 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          Remover acesso
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover co-admin</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza? O acesso de <strong>{initialEmail}</strong> será
              revogado imediatamente.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="flex-1 py-5 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? 'Removendo...' : 'Sim, remover'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
        <span className="text-blue-400 text-base font-bold leading-none mt-0.5">
          i
        </span>
        <p className="text-xs text-blue-800">
          O co-admin terá acesso total ao dashboard, exceto esta tela de
          configuração.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="co-admin-email">E-mail do co-admin</Label>
        <Input
          id="co-admin-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-auto py-2 border-gray-300"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="co-admin-password">Senha inicial</Label>
        <Input
          id="co-admin-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-auto py-2 border-gray-300"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full py-5" onClick={handleSet} disabled={loading}>
        {loading ? 'Salvando...' : 'Definir Co-admin'}
      </Button>
    </div>
  );
}
