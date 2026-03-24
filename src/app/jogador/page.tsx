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
import { AppLogo } from '@/components/app-logo';

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
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 bg-muted/40 p-4 gap-6">
      <AppLogo size="md" />
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
      <a
        href="https://www.youtube.com/@MaximumTechCorp"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-red-500"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        Como usar o app
      </a>
    </div>
  );
}
