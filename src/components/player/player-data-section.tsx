'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearPlayerCookie } from '@/actions/player';

const STAMINA_LABEL: Record<string, string> = {
  '1': '1 jogo',
  '2': '2 jogos',
  '3': '3 jogos',
  '4plus': '4 ou mais jogos',
};

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meus dados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Resistência</span>
          <span className="font-medium">
            {STAMINA_LABEL[player.stamina] ?? player.stamina}
          </span>
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
            Eu não sou esse jogador
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
