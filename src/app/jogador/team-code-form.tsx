'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { validateTeamCode, saveLastTeamCode } from '@/actions/player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AppLogo } from '@/components/app-logo';

export function TeamCodeForm() {
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

    await saveLastTeamCode(normalized);
    router.push(`/jogador/${normalized}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
        <p className="text-sm mt-4 font-bold" style={{ color: '#002776' }}>
          Acesse com o código da sua turma
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="h-auto py-2 border-gray-300 font-mono uppercase tracking-widest text-center"
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button
            type="submit"
            className="w-full py-5"
            disabled={!code.trim() || loading}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </Button>
        </form>
      </div>

      <div className="w-full max-w-sm mx-auto p-4 mt-1">
        <Link href="/">
          <Card className="cursor-pointer bg-primary/5 transition-colors ring-0">
            <CardContent className="flex items-center gap-4 py-1">
              <div className="bg-muted rounded-md p-3 shrink-0">
                <ArrowLeft className="w-5 h-5 text-primary" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-sm">Voltar para o início</p>
                <p className="text-xs text-muted-foreground">
                  Escolher tipo de acesso
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
