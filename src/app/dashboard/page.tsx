import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: admin }, { data: team }] = await Promise.all([
    supabase
      .from("admins")
      .select("id, name")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("teams")
      .select("name, access_code")
      .eq(
        "admin_id",
        (
          await supabase
            .from("admins")
            .select("id")
            .eq("user_id", user.id)
            .single()
        ).data?.id ?? ""
      )
      .single(),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bem-vindo, {admin?.name}!</CardTitle>
          <CardDescription>Painel do organizador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {team && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Turma</p>
              <p className="font-medium">{team.name}</p>
              <p className="text-sm text-muted-foreground">Código de acesso</p>
              <p className="font-mono font-bold tracking-widest">
                {team.access_code}
              </p>
            </div>
          )}
          <form action={logout}>
            <Button variant="outline" className="w-full" type="submit">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
