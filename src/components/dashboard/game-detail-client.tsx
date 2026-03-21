"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  cancelGame,
  removeConfirmedPlayer,
  promoteWaitlistPlayer,
  addPlayerToGame,
  createAndAddPlayer,
} from "@/actions/games-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { StaminaLevel } from "@/types/database.types";
import { getDrawInfo } from "@/lib/draw-algorithm";
import { DrawModal } from "@/components/dashboard/draw-modal";

interface Player {
  id: string;
  name: string;
  phone: string;
}

interface ConfirmedEntry {
  confirmationId: string;
  player: Player;
}

interface WaitlistEntry {
  confirmationId: string;
  position: number;
  player: Player;
}

interface Props {
  gameId: string;
  drawDone: boolean;
  confirmed: ConfirmedEntry[];
  waitlist: WaitlistEntry[];
  availablePlayers: { id: string; name: string }[];
}

// ── Botão cancelar jogo ──────────────────────────────────────────────────────

function CancelGameButton({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelGame(gameId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancelar jogo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar jogo?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O jogo ficará visível como
              cancelado para os jogadores.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelando...</>
              ) : (
                "Confirmar cancelamento"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Voltar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Lista de confirmados ─────────────────────────────────────────────────────

function ConfirmedList({
  gameId,
  entries,
}: {
  gameId: string;
  entries: ConfirmedEntry[];
}) {
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRemove(playerId: string) {
    setError(null);
    setLoadingId(playerId);
    startTransition(async () => {
      const result = await removeConfirmedPlayer(gameId, playerId);
      if (result.error) setError(result.error);
      setLoadingId(null);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Confirmados{" "}
          <span className="text-muted-foreground font-normal text-sm">
            ({entries.length}/25)
          </span>
        </h2>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nenhum confirmado ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {entries.map(({ confirmationId, player }) => (
            <li
              key={confirmationId}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive shrink-0"
                disabled={pending && loadingId === player.id}
                onClick={() => handleRemove(player.id)}
              >
                {pending && loadingId === player.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remover"
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Lista de espera ──────────────────────────────────────────────────────────

function WaitlistPanel({
  gameId,
  entries,
}: {
  gameId: string;
  entries: WaitlistEntry[];
}) {
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePromote(confirmationId: string) {
    setError(null);
    setLoadingId(confirmationId);
    startTransition(async () => {
      const result = await promoteWaitlistPlayer(confirmationId, gameId);
      if (result.error) setError(result.error);
      setLoadingId(null);
    });
  }

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold">
        Lista de espera{" "}
        <span className="text-muted-foreground font-normal text-sm">
          ({entries.length})
        </span>
      </h2>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-1">
        {entries.map(({ confirmationId, position, player }) => (
          <li
            key={confirmationId}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground w-4 shrink-0">
                {position}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.phone}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={pending && loadingId === confirmationId}
              onClick={() => handlePromote(confirmationId)}
            >
              {pending && loadingId === confirmationId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Promover"
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Select com pesquisa ──────────────────────────────────────────────────────

function SearchablePlayerSelect({
  players,
  value,
  onChange,
}: {
  players: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = players.find((p) => p.id === value);
  const filtered = search.trim()
    ? players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(player: { id: string; name: string }) {
    onChange(player.id);
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-1">
      <div
        className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Buscar jogador..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.name : "Selecionar jogador"}
          </span>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum jogador encontrado</p>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                {p.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Adicionar jogador existente ──────────────────────────────────────────────

function AddExistingPlayerPanel({
  gameId,
  availablePlayers,
}: {
  gameId: string;
  availablePlayers: { id: string; name: string }[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await addPlayerToGame(gameId, selectedId);
      if (result.error) setError(result.error);
      else setSelectedId("");
    });
  }

  if (availablePlayers.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Adicionar jogador da turma</Label>
      <div className="flex gap-2">
        <SearchablePlayerSelect
          players={availablePlayers}
          value={selectedId}
          onChange={setSelectedId}
        />
        <Button onClick={handleAdd} disabled={!selectedId || pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Adicionar"
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ── Cadastrar e adicionar novo jogador ───────────────────────────────────────

const newPlayerSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  phone: z.string().min(10, "Informe um celular válido"),
  weight_kg: z.number().min(30).max(250),
  stamina: z.enum(["1", "2", "3", "4plus"] as const),
});

type NewPlayerData = z.infer<typeof newPlayerSchema>;

function CreateAndAddPlayerPanel({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPlayerData>({
    resolver: zodResolver(newPlayerSchema),
  });

  async function onSubmit(data: NewPlayerData) {
    setServerError(null);
    const result = await createAndAddPlayer(gameId, {
      name: data.name,
      phone: data.phone,
      weight_kg: data.weight_kg,
      stamina: data.stamina as StaminaLevel,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
  }

  return (
    <div>
      {open ? (
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => { setOpen(false); reset(); setServerError(null); }}
        >
          <ChevronUp className="mr-1.5 h-4 w-4" />
          Não Cadastrar
        </Button>
      ) : (
        <Button
          className="bg-primary hover:bg-primary/80"
          onClick={() => setOpen(true)}
        >
          <ChevronDown className="mr-1.5 h-4 w-4" />
          Cadastrar novo jogador
        </Button>
      )}

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cn-name">Nome</Label>
            <Input id="cn-name" placeholder="Nome ou apelido" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cn-phone">Celular</Label>
            <Input id="cn-phone" type="tel" placeholder="(11) 99999-9999" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="cn-weight">Peso (kg)</Label>
              <Input
                id="cn-weight"
                type="number"
                placeholder="75"
                {...register("weight_kg", { valueAsNumber: true })}
              />
              {errors.weight_kg && (
                <p className="text-xs text-destructive">{errors.weight_kg.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Resistência</Label>
              <Select onValueChange={(v) => setValue("stamina", v as StaminaLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Jogos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jogo</SelectItem>
                  <SelectItem value="2">2 jogos</SelectItem>
                  <SelectItem value="3">3 jogos</SelectItem>
                  <SelectItem value="4plus">4+</SelectItem>
                </SelectContent>
              </Select>
              {errors.stamina && (
                <p className="text-xs text-destructive">{errors.stamina.message}</p>
              )}
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cadastrando...</>
            ) : (
              "Cadastrar e confirmar presença"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function GameDetailClient({
  gameId,
  drawDone,
  confirmed,
  waitlist,
  availablePlayers,
}: Props) {
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const drawInfo = getDrawInfo(confirmed.length);

  return (
    <div className="space-y-6">
      {/* Ações principais */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {!drawDone && (
            <Button
              disabled={!drawInfo.canDraw}
              onClick={() => setDrawModalOpen(true)}
            >
              Rodar sorteio
            </Button>
          )}
          {drawDone && (
            <Button disabled variant="secondary">Sorteio realizado</Button>
          )}
          <CancelGameButton gameId={gameId} />
        </div>
        {!drawDone && drawInfo.message && (
          <p
            className={`text-sm ${
              drawInfo.isWarning ? "text-yellow-600" : "text-destructive"
            }`}
          >
            {drawInfo.message}
          </p>
        )}
      </div>

      <Separator />

      {/* Confirmados */}
      <ConfirmedList gameId={gameId} entries={confirmed} />

      {/* Lista de espera */}
      {waitlist.length > 0 && (
        <>
          <Separator />
          <WaitlistPanel gameId={gameId} entries={waitlist} />
        </>
      )}

      <Separator />

      {/* Adicionar jogadores */}
      <div className="space-y-4">
        <h2 className="font-semibold">Adicionar jogador</h2>
        <AddExistingPlayerPanel
          gameId={gameId}
          availablePlayers={availablePlayers}
        />
        <CreateAndAddPlayerPanel gameId={gameId} />
      </div>

      <DrawModal
        gameId={gameId}
        confirmedCount={confirmed.length}
        open={drawModalOpen}
        onOpenChange={setDrawModalOpen}
      />
    </div>
  );
}
