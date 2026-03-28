import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { EntrarForm } from '@/components/player/entrar-form';
import { AppLogo } from '@/components/app-logo';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EntrarPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, name')
    .eq('access_code', upperCode)
    .maybeSingle();

  if (!team) notFound();

  const cookieStore = await cookies();
  const playerPhone = cookieStore.get(`player_${team.id}`)?.value;

  if (playerPhone) redirect(`/jogador/${upperCode}`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
        <p className="text-sm mt-4 font-bold" style={{ color: '#002776' }}>
          {team.name}
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <EntrarForm teamId={team.id} teamCode={upperCode} />
      </div>

      <div className="w-full max-w-sm mx-auto p-4 mt-1">
        <Link href="/jogador">
          <Card className="cursor-pointer bg-primary/5 transition-colors ring-0">
            <CardContent className="flex items-center gap-4 py-1">
              <div className="bg-muted rounded-md p-3 shrink-0">
                <ArrowLeft className="w-5 h-5 text-primary" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-sm">Trocar de turma</p>
                <p className="text-xs text-muted-foreground">
                  Inserir outro código
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
