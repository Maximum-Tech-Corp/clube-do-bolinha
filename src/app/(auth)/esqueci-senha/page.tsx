import { AppLogo } from '@/components/app-logo';
import { EsqueciSenhaForm } from '@/components/auth/esqueci-senha-form';

export default function EsqueciSenhaPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 bg-muted/40 p-4 gap-6">
      <AppLogo size="md" />
      <EsqueciSenhaForm />
    </div>
  );
}
