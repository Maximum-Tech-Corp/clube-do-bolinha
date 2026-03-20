import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/actions/stripe";
import { logout } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PagamentoPendentePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("name, subscription_status")
    .eq("user_id", user.id)
    .single();

  // Se já está ativo, não precisa ficar nesta página
  if (admin?.subscription_status === "active") redirect("/dashboard");

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
              Assinar agora
            </Button>
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
