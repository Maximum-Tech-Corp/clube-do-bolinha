import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRevalidatePath } from '@/test/mocks/next';

const {
  createGame,
  cancelGame,
  toggleTournament,
  listGames,
  removeConfirmedPlayer,
  moveToWaitlist,
  promoteWaitlistPlayer,
  addPlayerToGame,
  createAndAddPlayer,
} = await import('@/actions/games-admin');

function setupAdminChain(teamId = 'team-1') {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-uuid' } },
    error: null,
  });
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
  );
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: teamId }, error: null }),
  );
}

function setupUnauthenticated() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

// ─── createGame ───────────────────────────────────────────────────────────────

describe('createGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await createGame({
      location: 'Quadra',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when date is in the past', async () => {
    setupAdminChain();
    const result = await createGame({
      location: 'Quadra',
      scheduled_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    });
    expect(result).toEqual({ error: 'A data e hora devem ser no futuro.' });
  });

  it('inserts game and revalidates path on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await createGame({
      location: 'Quadra Municipal',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos');
  });

  it('returns error when insert fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'insert error' } }),
    );

    const result = await createGame({
      location: '',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toEqual({ error: 'Erro ao criar jogo.' });
  });

  it('inserts game without location when empty', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await createGame({
      location: '',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toEqual({});
  });
});

// ─── cancelGame ───────────────────────────────────────────────────────────────

describe('cancelGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await cancelGame('game-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await cancelGame('game-1');
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('returns error when game is not open', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'game-1', status: 'finished' },
        error: null,
      }),
    );

    const result = await cancelGame('game-1');
    expect(result).toEqual({
      error: 'Apenas jogos abertos podem ser cancelados.',
    });
  });

  it('updates status to cancelled and revalidates on success', async () => {
    setupAdminChain();
    // game found and is open
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1', status: 'open' }, error: null }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await cancelGame('game-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos');
  });
});

// ─── listGames ────────────────────────────────────────────────────────────────

describe('listGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty lists when unauthenticated', async () => {
    setupUnauthenticated();
    const result = await listGames();
    expect(result).toEqual({ upcoming: [], past: [] });
  });

  it('returns upcoming and past games on success', async () => {
    setupAdminChain();
    const upcomingGame = {
      id: 'g1',
      location: 'Quadra',
      scheduled_at: '2099-01-01T00:00:00Z',
      status: 'open',
      draw_done: false,
      is_tournament: false,
    };
    const pastGame = {
      id: 'g2',
      location: null,
      scheduled_at: '2020-01-01T00:00:00Z',
      status: 'finished',
      draw_done: true,
      is_tournament: false,
    };

    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [upcomingGame], error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [pastGame], error: null }),
    );

    const result = await listGames();
    expect(result).toEqual({ upcoming: [upcomingGame], past: [pastGame] });
  });

  it('returns empty arrays when queries return null data', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await listGames();
    expect(result).toEqual({ upcoming: [], past: [] });
  });
});

// ─── toggleTournament ─────────────────────────────────────────────────────────

describe('toggleTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await toggleTournament('game-1', true);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await toggleTournament('game-1', true);
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('returns error when draw not done', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'game-1', draw_done: false, status: 'open' },
        error: null,
      }),
    );

    const result = await toggleTournament('game-1', true);
    expect(result).toEqual({ error: 'O sorteio ainda não foi realizado.' });
  });

  it('returns error when game is cancelled', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'game-1', draw_done: true, status: 'cancelled' },
        error: null,
      }),
    );

    const result = await toggleTournament('game-1', true);
    expect(result).toEqual({ error: 'Jogo cancelado.' });
  });

  it('updates is_tournament and revalidates on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'game-1', draw_done: true, status: 'open' },
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await toggleTournament('game-1', true);

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });
});

// ─── removeConfirmedPlayer ────────────────────────────────────────────────────

describe('removeConfirmedPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await removeConfirmedPlayer('game-1', 'player-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await removeConfirmedPlayer('game-1', 'player-1');
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('removes player and revalidates', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await removeConfirmedPlayer('game-1', 'player-1');
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });
});

// ─── moveToWaitlist ───────────────────────────────────────────────────────────

describe('moveToWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await moveToWaitlist('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await moveToWaitlist('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('returns error when update fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // max waitlist_position query
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // update fails
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }),
    );
    const result = await moveToWaitlist('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Erro ao mover jogador para a fila.' });
  });

  it('moves player to end of waitlist and revalidates', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // max waitlist_position = 2, next = 3
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { waitlist_position: 2 }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await moveToWaitlist('conf-1', 'game-1');
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });

  it('assigns position 1 when waitlist is empty', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // no existing waitlist entries
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await moveToWaitlist('conf-1', 'game-1');
    expect(result).toEqual({});
  });
});

// ─── promoteWaitlistPlayer ────────────────────────────────────────────────────

describe('promoteWaitlistPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await promoteWaitlistPlayer('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await promoteWaitlistPlayer('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('returns error when update fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // confirmed count = 24 (below limit)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 24 }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }),
    );
    const result = await promoteWaitlistPlayer('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Erro ao promover jogador.' });
  });

  it('returns error when confirmed count is already 25', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 25 }),
    );
    const result = await promoteWaitlistPlayer('conf-1', 'game-1');
    expect(result).toEqual({ error: 'Limite de 25 confirmados atingido.' });
  });

  it('promotes player and revalidates on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // confirmed count = 24 (below limit)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 24 }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await promoteWaitlistPlayer('conf-1', 'game-1');
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });
});

// ─── addPlayerToGame ──────────────────────────────────────────────────────────

describe('addPlayerToGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await addPlayerToGame('game-1', 'player-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await addPlayerToGame('game-1', 'player-1');
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('adds player as confirmed when game not full', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // confirmed count = 10
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 10 }),
    );
    // upsert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await addPlayerToGame('game-1', 'player-1');
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });

  it('adds player to waitlist when game is full', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // confirmed count = 25 (full)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 25 }),
    );
    // max waitlist position
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { waitlist_position: 3 }, error: null }),
    );
    // upsert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await addPlayerToGame('game-1', 'player-1');
    expect(result).toEqual({});
  });

  it('returns error when upsert fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 5 }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'conflict' } }),
    );
    const result = await addPlayerToGame('game-1', 'player-1');
    expect(result).toEqual({ error: 'Erro ao adicionar jogador.' });
  });
});

// ─── createAndAddPlayer ───────────────────────────────────────────────────────

describe('createAndAddPlayer', () => {
  const playerParams = {
    name: 'Novo Jogador',
    phone: '11999999999',
    weight_kg: 70,
    stamina: '2' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await createAndAddPlayer('game-1', playerParams);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when game not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await createAndAddPlayer('game-1', playerParams);
    expect(result).toEqual({ error: 'Jogo não encontrado.' });
  });

  it('returns error when phone already exists in team', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // existing player with that phone
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    const result = await createAndAddPlayer('game-1', playerParams);
    expect(result).toEqual({
      error: 'Já existe um jogador com este telefone nesta turma.',
    });
  });

  it('returns error when player insert fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // no existing phone
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'insert error' } }), // insert fails
    );
    const result = await createAndAddPlayer('game-1', playerParams);
    expect(result).toEqual({ error: 'Erro ao cadastrar jogador.' });
  });

  it('creates player and adds to game on success', async () => {
    // createAndAddPlayer chain
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }), // game check
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // no existing phone
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'new-player-1' }, error: null }), // insert player
    );
    // addPlayerToGame also calls getAdminTeamId() internally
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }), // game check in addPlayerToGame
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 5 }), // confirmed count
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // upsert
    );

    const result = await createAndAddPlayer('game-1', playerParams);
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogos/game-1');
  });
});
