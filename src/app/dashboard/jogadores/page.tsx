import Link from "next/link";
import { listPlayers } from "@/actions/players-admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const staminaLabel: Record<string, string> = {
  "1": "1 jogo",
  "2": "2 jogos",
  "3": "3 jogos",
  "4plus": "4+ jogos",
};

export default async function JogadoresPage() {
  const { players, error } = await listPlayers();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Jogadores</h1>
          <p className="text-sm text-muted-foreground">
            {players.length} jogador{players.length !== 1 ? "es" : ""} cadastrado
            {players.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/jogadores/novo"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-2.5 h-7 text-[0.8rem] font-medium hover:bg-primary/80 transition-colors"
        >
          + Novo
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {players.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          Nenhum jogador cadastrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Link
              key={player.id}
              href={`/dashboard/jogadores/${player.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{player.name}</span>
                        {player.is_star && (
                          <Badge variant="secondary" className="shrink-0">
                            ⭐ Destaque
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {player.phone} · {player.weight_kg} kg ·{" "}
                        {staminaLabel[player.stamina]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {player.attendanceRate !== null
                          ? `${player.attendanceRate}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">presença</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline"
        >
          ← Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
