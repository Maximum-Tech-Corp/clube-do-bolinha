import Link from "next/link";
import { NewGameForm } from "@/components/dashboard/new-game-form";

export default function NovoJogoPage() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Novo jogo</h1>
        <p className="text-sm text-muted-foreground">Agende uma partida para a turma</p>
      </div>

      <NewGameForm />

      <Link
        href="/dashboard/jogos"
        className="block text-sm text-muted-foreground underline"
      >
        ← Voltar
      </Link>
    </div>
  );
}
