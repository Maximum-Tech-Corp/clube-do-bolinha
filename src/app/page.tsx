import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { AppLogo } from '@/components/app-logo';
import { ShareAppLink } from '@/components/share-app-link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
        <p className="text-sm mt-4 text-white">
          Organize o futebol da sua turma
        </p>
      </div>

      <div className="w-full max-w-sm mx-auto px-6 pt-8">
        <p className="text-xs text-muted-foreground text-center mb-4">
          Selecione o tipo de acesso para começar
        </p>

        <div className="space-y-6">
          <Link href="/login" className="block">
            <div className="flex items-center gap-4 bg-primary/5 rounded-xl px-4 py-6 hover:bg-primary/10 transition-colors cursor-pointer">
              <ShieldCheck
                className="w-6 h-6 text-primary shrink-0"
                strokeWidth={2.5}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Organizador</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acesso ao administração do racha da turma
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>

          <Link href="/jogador" className="block">
            <div className="flex items-center gap-4 bg-primary/5 rounded-xl px-4 py-6 hover:bg-primary/10 transition-colors cursor-pointer">
              <span className="text-2xl shrink-0">⚽</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Jogador</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acesso para marcar presença nos jogos e ver a lista de
                  jogadores
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        </div>

        <div className="flex justify-center pt-4">
          <ShareAppLink />
        </div>
      </div>

      {/* Rodapé fixo Maximum Tech */}
      <footer className="fixed bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-1 py-3 bg-muted/40 backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://raw.githubusercontent.com/diegoMasin/landing-maximumtech/master/assets/img/new-logo-mt-01.png"
          alt="Maximum Tech"
          width={400}
          height={101}
          className="h-7 w-auto opacity-60"
        />
        <span className="text-xs text-muted-foreground/60">v1.0.0 Beta</span>
      </footer>
    </div>
  );
}
