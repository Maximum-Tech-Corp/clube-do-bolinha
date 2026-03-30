'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, ArrowLeftRight } from 'lucide-react';
import { clearLastTeamCode } from '@/actions/player';

interface Props {
  teamCode: string;
}

export function PlayerBottomNav({ teamCode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const jogosHref = `/jogador/${teamCode}`;

  const linkItems = [
    { href: '/', label: 'Início', icon: Home, exact: true },
    { href: jogosHref, label: 'Jogos', icon: Calendar, exact: false },
  ];

  const isTrocarTurmaActive = pathname === '/jogador';

  async function handleTrocarTurma() {
    await clearLastTeamCode();
    router.push('/jogador');
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur z-50">
      <div className="max-w-md mx-auto flex">
        {linkItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-14 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleTrocarTurma}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-14 ${
            isTrocarTurmaActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowLeftRight
            className={`h-5 w-5 ${isTrocarTurmaActive ? 'stroke-[2.5px]' : ''}`}
          />
          <span>Trocar turma</span>
        </button>
      </div>
    </nav>
  );
}
