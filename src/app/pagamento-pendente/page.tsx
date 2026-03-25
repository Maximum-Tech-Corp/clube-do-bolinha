import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/actions/stripe';
import { logout } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function PagamentoPendentePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: admin } = await supabase
    .from('admins')
    .select('name, subscription_status')
    .eq('user_id', user.id)
    .single();

  // Se já está ativo, não precisa ficar nesta página
  if (admin?.subscription_status === 'active') redirect('/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ativar assinatura</CardTitle>
          <CardDescription>
            Olá, {admin?.name}. Para acessar o painel e organizar sua turma,
            assine o plano mensal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={createCheckoutSession}>
            <Button type="submit" className="w-full">
              Assine agora
            </Button>
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 mt-2">
              <span className="text-blue-400 text-base font-bold leading-none mt-0.5">
                i
              </span>
              <p className="text-xs text-blue-800">
                A cobrança mensal será recorrente. E você poderá cancelar quando
                quiser após login.
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2"></p>
          </form>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="w-full">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
