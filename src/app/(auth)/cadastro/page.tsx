import { AppLogo } from '@/components/app-logo';
import { CadastroForm } from '@/components/auth/cadastro-form';

export default function CadastroPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 bg-muted/40 p-4 gap-6">
      <AppLogo size="md" />
      <CadastroForm />
    </div>
  );
}
