import Link from 'next/link';
import { NewPlayerForm } from '@/components/dashboard/new-player-form';

export default function NovoJogadorPage() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Novo jogador</h1>
        <p className="text-sm text-muted-foreground">
          Cadastro manual de jogador na turma
        </p>
      </div>

      <NewPlayerForm />

      <Link
        href="/dashboard/jogadores"
        className="block text-sm text-muted-foreground underline"
      >
        ← Voltar
      </Link>
    </div>
  );
}
