"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "@/actions/games-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewGameForm() {
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateTime) return;

    setError(null);
    setLoading(true);

    // Converte datetime-local (horário local do navegador) para ISO UTC
    const isoUtc = new Date(dateTime).toISOString();
    const result = await createGame({ location, scheduled_at: isoUtc });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard/jogos");
  }

  // Mínimo = agora (para o input datetime-local)
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="dateTime">Data e horário</Label>
        <Input
          id="dateTime"
          type="datetime-local"
          min={minDateTime}
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Local (opcional)</Label>
        <Input
          id="location"
          placeholder="Ex: Quadra do Parque, Ginásio Municipal"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={!dateTime || loading}>
        {loading ? "Salvando..." : "Criar jogo"}
      </Button>
    </form>
  );
}
