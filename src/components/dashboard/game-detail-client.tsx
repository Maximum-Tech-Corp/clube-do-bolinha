'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelGame,
  removeConfirmedPlayer,
  moveToWaitlist,
  promoteWaitlistPlayer,
  addPlayerToGame,
} from '@/actions/games-admin';
import { resetDraw } from '@/actions/draw';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Shuffle, RotateCcw, XCircle, UserCheck } from 'lucide-react';
import { getDrawInfo } from '@/lib/draw-algorithm';
import { DrawModal } from '@/components/dashboard/draw-modal';

interface Player {
  id: string;
  name: string;
  phone: string;
  is_banned: boolean;
  suspended_until: string | null;
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

interface AvailablePlayer {
  id: string;
  name: string;
  is_banned: boolean;
  suspended_until: string | null;
}

interface Props {
  gameId: string;
  drawDone: boolean;
  hasAnyStats: boolean;
  confirmed: ConfirmedEntry[];
  waitlist: WaitlistEntry[];
  availablePlayers: AvailablePlayer[];
}

// ── Botão cancelar jogo ──────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

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
      <Button
        variant="destructive"
        className="py-5"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-4 w-4" />
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar cancelamento'
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

type ConfirmedDialogState = {
  type: 'remove' | 'move';
  playerId: string;
  confirmationId: string;
  playerName: string;
} | null;

function ConfirmedList({
  gameId,
  entries,
  drawDone,
}: {
  gameId: string;
  entries: ConfirmedEntry[];
  drawDone: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<ConfirmedDialogState>(null);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!dialog) return;
    setError(null);
    startTransition(async () => {
      const result =
        dialog.type === 'remove'
          ? await removeConfirmedPlayer(gameId, dialog.playerId)
          : await moveToWaitlist(dialog.confirmationId, gameId);
      if (result.error) {
        setError(result.error);
      } else {
        setDialog(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nenhum confirmado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map(({ confirmationId, player }) => (
            <li
              key={confirmationId}
              className="flex items-center justify-between gap-2 rounded-lg shadow-md bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{player.name}</p>
                  {player.is_banned && (
                    <Badge variant="destructive" className="shrink-0">
                      Banido
                    </Badge>
                  )}
                  {!player.is_banned &&
                    player.suspended_until &&
                    new Date(player.suspended_until) > new Date() && (
                      <Badge className="shrink-0 bg-yellow-100 text-yellow-700 border-transparent">
                        Suspenso
                      </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(player.phone)}
                </p>
              </div>
              {!drawDone && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-500 hover:text-orange-500 hover:bg-orange-50"
                    onClick={() =>
                      setDialog({
                        type: 'move',
                        playerId: player.id,
                        confirmationId,
                        playerName: player.name,
                      })
                    }
                  >
                    Espera
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setDialog({
                        type: 'remove',
                        playerId: player.id,
                        confirmationId,
                        playerName: player.name,
                      })
                    }
                  >
                    Remover
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'remove'
                ? 'Remover jogador?'
                : 'Mover para a fila de espera?'}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === 'remove'
                ? `${dialog.playerName} será removido da lista de confirmados.`
                : `${dialog?.playerName} será movido para a lista de espera.`}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant={dialog?.type === 'remove' ? 'destructive' : 'default'}
              className={
                dialog?.type === 'move'
                  ? 'flex-1 bg-orange-500 hover:bg-orange-600'
                  : 'flex-1'
              }
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : dialog?.type === 'remove' ? (
                'Confirmar remoção'
              ) : (
                'Confirmar'
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Lista de espera ──────────────────────────────────────────────────────────

function WaitlistPanel({
  gameId,
  entries,
  confirmedCount,
}: {
  gameId: string;
  entries: WaitlistEntry[];
  confirmedCount: number;
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
        Lista de espera{' '}
        <span className="text-muted-foreground font-normal text-sm">
          ({entries.length})
        </span>
      </h2>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-2">
        {entries.map(({ confirmationId, position, player }) => (
          <li
            key={confirmationId}
            className="flex items-center justify-between gap-2 rounded-lg shadow-md bg-gray-50 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground w-4 shrink-0">
                {position}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{player.name}</p>
                  {player.is_banned && (
                    <Badge variant="destructive" className="shrink-0">
                      Banido
                    </Badge>
                  )}
                  {!player.is_banned &&
                    player.suspended_until &&
                    new Date(player.suspended_until) > new Date() && (
                      <Badge className="shrink-0 bg-yellow-100 text-yellow-700 border-transparent">
                        Suspenso
                      </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(player.phone)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={
                confirmedCount >= 25 ||
                (pending && loadingId === confirmationId)
              }
              onClick={() => handlePromote(confirmationId)}
            >
              {pending && loadingId === confirmationId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Promover'
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
  disabled = false,
}: {
  players: AvailablePlayer[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = players.find(p => p.id === value);
  const filtered = search.trim()
    ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(player: AvailablePlayer) {
    onChange(player.id);
    setSearch('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-1">
      <div
        className={`flex h-auto w-full items-center rounded-md border border-input bg-background px-3 py-2.5 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        {open ? (
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Buscar jogador..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        ) : selected ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{selected.name}</span>
            {selected.is_banned && (
              <Badge variant="destructive" className="shrink-0 text-xs">
                Banido
              </Badge>
            )}
            {!selected.is_banned &&
              selected.suspended_until &&
              new Date(selected.suspended_until) > new Date() && (
                <Badge className="shrink-0 text-xs bg-yellow-100 text-yellow-700 border-transparent">
                  Suspenso
                </Badge>
              )}
          </div>
        ) : (
          <span className="text-muted-foreground">Selecionar jogador</span>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum jogador encontrado
            </p>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                <span className="truncate">{p.name}</span>
                {p.is_banned && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    Banido
                  </Badge>
                )}
                {!p.is_banned &&
                  p.suspended_until &&
                  new Date(p.suspended_until) > new Date() && (
                    <Badge className="shrink-0 text-xs bg-yellow-100 text-yellow-700 border-transparent">
                      Suspenso
                    </Badge>
                  )}
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
  drawDone,
}: {
  gameId: string;
  availablePlayers: AvailablePlayer[];
  drawDone: boolean;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await addPlayerToGame(gameId, selectedId);
      if (result.error) setError(result.error);
      else setSelectedId('');
    });
  }

  if (availablePlayers.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Confirmar jogador manualmente</Label>
      <div className="flex gap-2">
        <SearchablePlayerSelect
          players={availablePlayers}
          value={selectedId}
          onChange={setSelectedId}
          disabled={drawDone}
        />
        <Button
          className="py-5"
          onClick={handleAdd}
          disabled={drawDone || !selectedId || pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
              Confirmar
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function GameDetailClient({
  gameId,
  drawDone,
  hasAnyStats,
  confirmed,
  waitlist,
  availablePlayers,
}: Props) {
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [redrawDialogOpen, setRedrawDialogOpen] = useState(false);
  const [redrawError, setRedrawError] = useState<string | null>(null);
  const [redrawPending, startRedrawTransition] = useTransition();
  const router = useRouter();
  const drawInfo = getDrawInfo(confirmed.length);

  function handleRedraw() {
    setRedrawError(null);
    startRedrawTransition(async () => {
      const result = await resetDraw(gameId);
      if (result.error) {
        setRedrawError(result.error);
        setRedrawDialogOpen(false);
        return;
      }
      setRedrawDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Ações principais */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap justify-end">
          {!drawDone && (
            <Button
              className="py-5"
              disabled={!drawInfo.canDraw}
              onClick={() => setDrawModalOpen(true)}
            >
              <Shuffle className="h-4 w-4" />
              Rodar sorteio
            </Button>
          )}
          {drawDone && !hasAnyStats && (
            <Button
              variant="outline"
              className="py-5 border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-600"
              onClick={() => setRedrawDialogOpen(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Desfazer Sorteio
            </Button>
          )}
          <CancelGameButton gameId={gameId} />
        </div>
        {!drawDone && drawInfo.message && (
          <p
            className={`text-xs text-right ${
              drawInfo.isWarning ? 'text-yellow-600' : 'text-destructive'
            }`}
          >
            {drawInfo.message}
          </p>
        )}
        {redrawError && (
          <p className="text-xs text-right text-destructive">{redrawError}</p>
        )}
      </div>

      {/* Dialog de confirmação — re-sortear */}
      <Dialog open={redrawDialogOpen} onOpenChange={setRedrawDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desfazer Sorteio?</DialogTitle>
            <DialogDescription>
              Os times atuais serão descartados e um novo sorteio poderá ser
              realizado com os mesmos jogadores confirmados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleRedraw}
              disabled={redrawPending}
            >
              {redrawPending ? 'Resetando...' : 'Confirmar'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRedrawDialogOpen(false)}
              disabled={redrawPending}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="confirmados">
        <TabsList variant="line" className="w-full border-b border-border pb-0">
          <TabsTrigger value="confirmados" className="flex-1 pb-2">
            Confirmados
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              ({confirmed.length}/25)
            </span>
          </TabsTrigger>
          <TabsTrigger value="adicionar" className="flex-1 pb-2">
            Confirmar manualmente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="confirmados" className="mt-3 space-y-4">
          <ConfirmedList
            gameId={gameId}
            entries={confirmed}
            drawDone={drawDone}
          />
          {waitlist.length > 0 && (
            <>
              <Separator />
              <WaitlistPanel
                gameId={gameId}
                entries={waitlist}
                confirmedCount={confirmed.length}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="adicionar" className="mt-3">
          <AddExistingPlayerPanel
            gameId={gameId}
            availablePlayers={availablePlayers}
            drawDone={drawDone}
          />
        </TabsContent>
      </Tabs>

      <DrawModal
        gameId={gameId}
        confirmedCount={confirmed.length}
        open={drawModalOpen}
        onOpenChange={setDrawModalOpen}
      />
    </div>
  );
}
