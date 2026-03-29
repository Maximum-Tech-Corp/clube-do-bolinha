import { NewPlayerForm } from '@/components/dashboard/new-player-form';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

export default function NovoJogadorPage() {
  return (
    <>
      <AdminPageHeader title="Novo jogador" backHref="/dashboard/jogadores" />
      <div className="max-w-md mx-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Cadastro manual de jogador na turma
        </p>

        <NewPlayerForm />
      </div>
    </>
  );
}
