import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccessCodeCard } from "@/components/dashboard/access-code-card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!admin) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("name, access_code")
    .eq("admin_id", admin.id)
    .single();

  if (!team) redirect("/login");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Olá, {admin.name}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Turma:{" "}
            <span className="font-medium text-foreground">{team.name}</span>
          </p>
        </CardContent>
      </Card>

      <AccessCodeCard
        teamName={team.name}
        accessCode={team.access_code}
        appUrl={appUrl}
      />

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/dashboard/jogadores"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          Jogadores
        </Link>
        <Link
          href="/dashboard/jogos"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          Jogos
        </Link>
        <Link
          href="/dashboard/historico"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          Histórico
        </Link>
        <Link
          href="/dashboard/rankings"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          Rankings
        </Link>
      </div>

      <form action={logout}>
        <Button variant="outline" className="w-full" type="submit">
          Sair
        </Button>
      </form>
    </div>
  );
}
