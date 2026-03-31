'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { clearPlayerCookie } from '@/actions/player';

interface Props {
  player: {
    name: string;
    phone: string;
    weight_kg: number;
    stamina: string;
    is_star: boolean;
  };
  teamId: string;
  teamCode: string;
}

export function PlayerDataSection({ player, teamId, teamCode }: Props) {
  const router = useRouter();

  async function handleNotMe() {
    await clearPlayerCookie(teamId);
    router.push(`/jogador/${teamCode}/entrar`);
  }

  return (
    <div className="rounded-lg shadow-md bg-gray-50 px-3 py-4 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Meus dados</p>
        <Link
          href={`/jogador/${teamCode}/editar`}
          className="text-primary hover:text-primary/80 transition-colors"
          aria-label="Editar meus dados"
        >
          <Pencil className="h-5 w-5" />
        </Link>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Nome</span>
        <span className="font-medium">{player.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Telefone</span>
        <span className="font-medium">{player.phone}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Peso</span>
        <span className="font-medium">{player.weight_kg} kg</span>
      </div>
      {player.is_star && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Classificação</span>
          <span className="font-medium">⭐ Estrela</span>
        </div>
      )}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleNotMe}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Sair e entrar como outro Jogador
        </button>
      </div>
    </div>
  );
}
