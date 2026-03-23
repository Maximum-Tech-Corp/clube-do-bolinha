'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateTeamCode } from '@/actions/player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function JogadorPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    setError(null);

    const { valid } = await validateTeamCode(normalized);

    if (!valid) {
      setError('Código inválido. Verifique com o organizador da turma.');
      setLoading(false);
      return;
    }

    router.push(`/jogador/${normalized}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Acesso do jogador</CardTitle>
          <CardDescription>
            Informe o código da turma para entrar
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="code">Código da turma</Label>
              <Input
                id="code"
                placeholder="XXXX-XXXXXX"
                value={code}
                onChange={e => {
                  setCode(e.target.value);
                  setError(null);
                }}
                className="font-mono uppercase tracking-widest text-center"
                autoComplete="off"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!code.trim() || loading}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/" className="underline">
                Voltar
              </Link>
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
