import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLogo } from '@/components/app-logo';
import { EsqueciSenhaForm } from '@/components/auth/esqueci-senha-form';
import { Card, CardContent } from '@/components/ui/card';

export default function EsqueciSenhaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <EsqueciSenhaForm />
      </div>

      <div className="w-full max-w-sm mx-auto p-4 mt-1">
        <Link href="/login">
          <Card className="cursor-pointer bg-primary/5 transition-colors ring-0">
            <CardContent className="flex items-center gap-4 py-1">
              <div className="bg-muted rounded-md p-3 shrink-0">
                <ArrowLeft className="w-5 h-5 text-primary" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-sm">Voltar para o login</p>
                <p className="text-xs text-muted-foreground">
                  Lembrei da minha senha
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
