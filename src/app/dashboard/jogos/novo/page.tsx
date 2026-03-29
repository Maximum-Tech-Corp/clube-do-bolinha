import { NewGameForm } from '@/components/dashboard/new-game-form';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

export default function NovoJogoPage() {
  return (
    <>
      <AdminPageHeader title="Novo jogo" backHref="/dashboard/jogos" />
      <div className="max-w-md mx-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Agende uma partida para a turma
        </p>

        <NewGameForm />
      </div>
    </>
  );
}
