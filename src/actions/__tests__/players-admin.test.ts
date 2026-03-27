import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRevalidatePath } from '@/test/mocks/next';

const {
  createPlayer,
  updatePlayer,
  banPlayer,
  unbanPlayer,
  suspendPlayer,
  removeSuspension,
  listPlayers,
  getPlayer,
  getPlayerStats,
  addRetroactiveStat,
  deleteRetroactiveStat,
} = await import('@/actions/players-admin');

// Helper: configure the auth + admin + team chain (getAdminTeamId)
function setupAdminChain(teamId = 'team-1') {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-uuid' } },
    error: null,
  });

  // admins.select().eq().single() → admin
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
  );
  // teams.select().eq().single() → team
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

function setupAdminNotFound() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-uuid' } },
    error: null,
  });
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: null, error: null }), // admin not found
  );
}

function setupTeamNotFound() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-uuid' } },
    error: null,
  });
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: 'admin-uuid' }, error: null }), // admin found
  );
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: null, error: null }), // team not found
  );
}

// ─── createPlayer ─────────────────────────────────────────────────────────────

describe('createPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized error when no user session', async () => {
    setupUnauthenticated();
    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns unauthorized when admin record not found (line 21)', async () => {
    setupAdminNotFound();
    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns unauthorized when team record not found (line 29)', async () => {
    setupTeamNotFound();
    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when phone already exists in team', async () => {
    setupAdminChain();
    // duplicate phone check returns existing player
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'existing-player' }, error: null }),
    );

    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });

    expect(result).toEqual({
      error: 'Já existe um jogador com este telefone nesta turma.',
    });
  });

  it('inserts player and revalidates path on success', async () => {
    setupAdminChain();
    // phone check: no duplicate
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // insert: success
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogadores');
  });

  it('returns error when insert fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // no duplicate
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'insert error' } }),
    );

    const result = await createPlayer({
      name: 'João',
      phone: '11999999999',
      weight_kg: 75,
      stamina: '3',
    });

    expect(result).toEqual({ error: 'Erro ao criar jogador.' });
  });
});

// ─── updatePlayer (error branch) ──────────────────────────────────────────────

// ─── updatePlayer ─────────────────────────────────────────────────────────────

describe('updatePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized error when no user session', async () => {
    setupUnauthenticated();
    const result = await updatePlayer('player-1', {
      name: 'X',
      weight_kg: 70,
      stamina: '2',
      position: null,
      is_star: false,
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when player does not belong to team', async () => {
    setupAdminChain();
    // ownership check: player not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await updatePlayer('player-1', {
      name: 'X',
      weight_kg: 70,
      stamina: '2',
      position: null,
      is_star: false,
    });

    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when update fails (line 278)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // ownership OK
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }), // update fails
    );

    const result = await updatePlayer('player-1', {
      name: 'X',
      weight_kg: 70,
      stamina: '2',
      position: null,
      is_star: false,
    });

    expect(result).toEqual({ error: 'Erro ao atualizar jogador.' });
  });

  it('updates player and revalidates paths on success', async () => {
    setupAdminChain();
    // ownership OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    // update OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await updatePlayer('player-1', {
      name: 'João Atualizado',
      weight_kg: 80,
      stamina: '4plus',
      position: null,
      is_star: true,
    });

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/jogadores');
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });
});

// ─── banPlayer / unbanPlayer ──────────────────────────────────────────────────

describe('banPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized error when no user session', async () => {
    setupUnauthenticated();
    const result = await banPlayer('player-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('sets is_banned to true and revalidates path on success', async () => {
    setupAdminChain();
    // ownership OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    // update OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await banPlayer('player-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });

  it('returns error when player not in team', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // ownership fails
    );

    const result = await banPlayer('player-1');
    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when update fails (line 139)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // ownership OK
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }), // update fails
    );

    const result = await banPlayer('player-1');
    expect(result).toEqual({ error: 'Erro ao banir jogador.' });
  });
});

describe('unbanPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session (line 148)', async () => {
    setupUnauthenticated();
    const result = await unbanPlayer('player-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when player not in team (lines 149-150)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // ownership fails
    );
    const result = await unbanPlayer('player-1');
    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when update fails (line 158)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // ownership OK
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }), // update fails
    );
    const result = await unbanPlayer('player-1');
    expect(result).toEqual({ error: 'Erro ao remover banimento.' });
  });

  it('sets is_banned to false and revalidates path', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await unbanPlayer('player-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });
});

// ─── suspendPlayer ────────────────────────────────────────────────────────────

describe('suspendPlayer', () => {
  const FUTURE = '2099-12-31T23:59:59.999Z';
  const PAST = '2000-01-01T23:59:59.999Z';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when player not in team (line 171)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // ownership fails
    );
    const result = await suspendPlayer('player-1', FUTURE, 'reason');
    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('stores null reason when reason is empty (line 181)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await suspendPlayer('player-1', FUTURE, '');
    expect(result).toEqual({});
  });

  it('returns error when update fails (line 185)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }),
    );
    const result = await suspendPlayer('player-1', FUTURE, 'reason');
    expect(result).toEqual({ error: 'Erro ao suspender jogador.' });
  });

  it('returns error when date is in the past', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );

    const result = await suspendPlayer('player-1', PAST, 'reason');
    expect(result).toEqual({
      error: 'A data de encerramento deve ser futura.',
    });
  });

  it('updates suspension fields and revalidates path on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await suspendPlayer('player-1', FUTURE, 'bad behavior');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await suspendPlayer('player-1', FUTURE, 'reason');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });
});

// ─── removeSuspension ─────────────────────────────────────────────────────────

describe('removeSuspension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session (line 194)', async () => {
    setupUnauthenticated();
    const result = await removeSuspension('player-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when update fails (line 204)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // ownership OK
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }), // update fails
    );
    const result = await removeSuspension('player-1');
    expect(result).toEqual({ error: 'Erro ao remover suspensão.' });
  });

  it('clears suspension fields and revalidates path', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await removeSuspension('player-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });

  it('returns error when player not in team', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await removeSuspension('player-1');
    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });
});

// ─── listPlayers ──────────────────────────────────────────────────────────────

describe('listPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized error when no user', async () => {
    setupUnauthenticated();
    const result = await listPlayers();
    expect(result).toEqual({ error: 'Não autorizado', players: [] });
  });

  it('returns error when players query fails (line 45)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }), // players query error
    );
    const result = await listPlayers();
    expect(result).toEqual({ error: 'Erro ao buscar jogadores.', players: [] });
  });

  it('handles null finishedGames with ?? [] (line 56)', async () => {
    setupAdminChain();
    const players = [
      {
        id: 'p1',
        name: 'João',
        phone: '11999',
        weight_kg: 70,
        stamina: '3',
        is_star: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
    mockSupabaseFrom
      .mockReturnValueOnce(createQueryMock({ data: players, error: null }))
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // finishedGames null
      .mockReturnValueOnce(createQueryMock({ data: [], error: null }));
    const result = await listPlayers();
    expect(result.players[0].attendanceRate).toBeNull();
  });

  it('handles null confirmationsRaw with ?? [] (line 69)', async () => {
    setupAdminChain();
    const players = [
      {
        id: 'p1',
        name: 'João',
        phone: '11999',
        weight_kg: 70,
        stamina: '3',
        is_star: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
    const games = [{ id: 'g1', scheduled_at: '2025-01-15T10:00:00Z' }];
    mockSupabaseFrom
      .mockReturnValueOnce(createQueryMock({ data: players, error: null }))
      .mockReturnValueOnce(createQueryMock({ data: games, error: null }))
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })); // confirmations null
    const result = await listPlayers();
    expect(result.players[0].attendanceRate).toBe(0);
    expect(result.players[0].attendanceCount).toBe(0);
  });

  it('returns enriched players with attendanceRate', async () => {
    setupAdminChain();

    const players = [
      {
        id: 'p1',
        name: 'João',
        phone: '11999',
        weight_kg: 70,
        stamina: '3',
        is_star: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
    const games = [
      { id: 'g1', scheduled_at: '2025-01-15T10:00:00Z' },
      { id: 'g2', scheduled_at: '2025-02-15T10:00:00Z' },
    ];
    const confirmations = [{ player_id: 'p1', game_id: 'g1' }];

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryMock({ data: players, error: null })) // players
      .mockReturnValueOnce(createQueryMock({ data: games, error: null })) // finished games
      .mockReturnValueOnce(
        createQueryMock({ data: confirmations, error: null }),
      ); // confirmations

    const result = await listPlayers();

    expect(result.players).toHaveLength(1);
    expect(result.players[0].attendanceRate).toBe(50); // 1/2 games = 50%
    expect(result.players[0].attendanceCount).toBe(1);
  });

  it('returns attendanceRate null when no finished games', async () => {
    setupAdminChain();

    const players = [
      {
        id: 'p1',
        name: 'João',
        phone: '11999',
        weight_kg: 70,
        stamina: '3',
        is_star: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryMock({ data: players, error: null }))
      .mockReturnValueOnce(createQueryMock({ data: [], error: null })) // no finished games
      .mockReturnValueOnce(createQueryMock({ data: [], error: null }));

    const result = await listPlayers();

    expect(result.players[0].attendanceRate).toBeNull();
  });

  it("only counts games after player's created_at date", async () => {
    setupAdminChain();

    const players = [
      {
        id: 'p1',
        name: 'João',
        phone: '11999',
        weight_kg: 70,
        stamina: '3',
        is_star: false,
        created_at: '2025-02-01T00:00:00Z', // registered Feb 2025
      },
    ];
    const games = [
      { id: 'g1', scheduled_at: '2025-01-15T10:00:00Z' }, // BEFORE player created_at
      { id: 'g2', scheduled_at: '2025-03-15T10:00:00Z' }, // AFTER
    ];
    const confirmations = [
      { player_id: 'p1', game_id: 'g1' },
      { player_id: 'p1', game_id: 'g2' },
    ];

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryMock({ data: players, error: null }))
      .mockReturnValueOnce(createQueryMock({ data: games, error: null }))
      .mockReturnValueOnce(
        createQueryMock({ data: confirmations, error: null }),
      );

    const result = await listPlayers();

    // Only g2 is eligible (after created_at), so 1/1 = 100%
    expect(result.players[0].attendanceRate).toBe(100);
  });
});

// ─── getPlayerStats ───────────────────────────────────────────────────────────

describe('getPlayerStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no user session', async () => {
    setupUnauthenticated();
    const result = await getPlayerStats('player-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null (line 296)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await getPlayerStats('player-1');
    expect(result).toEqual([]);
  });

  it('returns stat adjustments ordered by year', async () => {
    setupAdminChain();
    const stats = [
      { id: 's1', year: 2024, goals: 10, assists: 5, created_at: '2024-01-01' },
      { id: 's2', year: 2023, goals: 7, assists: 3, created_at: '2023-01-01' },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: stats, error: null }),
    );

    const result = await getPlayerStats('player-1');
    expect(result).toEqual(stats);
  });
});

// ─── addRetroactiveStat ───────────────────────────────────────────────────────

describe('addRetroactiveStat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await addRetroactiveStat({
      playerId: 'player-1',
      year: 2024,
      goals: 5,
      assists: 2,
    });
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('inserts stat and revalidates path on success', async () => {
    setupAdminChain();
    // ownership OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    // insert OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await addRetroactiveStat({
      playerId: 'player-1',
      year: 2024,
      goals: 5,
      assists: 2,
    });

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });

  it('returns error when player not in team', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await addRetroactiveStat({
      playerId: 'player-1',
      year: 2024,
      goals: 5,
      assists: 2,
    });

    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when insert fails', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'insert failed' } }),
    );

    const result = await addRetroactiveStat({
      playerId: 'player-1',
      year: 2024,
      goals: 5,
      assists: 2,
    });

    expect(result).toEqual({ error: 'Erro ao salvar estatísticas.' });
  });
});

// ─── deleteRetroactiveStat ────────────────────────────────────────────────────

describe('deleteRetroactiveStat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await deleteRetroactiveStat('stat-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when stat is not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await deleteRetroactiveStat('stat-1');
    expect(result).toEqual({ error: 'Lançamento não encontrado.' });
  });

  it('returns unauthorized when player does not belong to team', async () => {
    setupAdminChain();
    // stat found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'stat-1', player_id: 'player-1' },
        error: null,
      }),
    );
    // assertPlayerOwnership → player not in team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await deleteRetroactiveStat('stat-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when delete fails', async () => {
    setupAdminChain();
    // stat found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'stat-1', player_id: 'player-1' },
        error: null,
      }),
    );
    // assertPlayerOwnership → OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    // delete → fails
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }),
    );
    const result = await deleteRetroactiveStat('stat-1');
    expect(result).toEqual({ error: 'Erro ao remover lançamento.' });
  });

  it('deletes stat and revalidates path on success', async () => {
    setupAdminChain();
    // stat found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'stat-1', player_id: 'player-1' },
        error: null,
      }),
    );
    // assertPlayerOwnership → OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    // delete → OK
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await deleteRetroactiveStat('stat-1');
    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogadores/player-1',
    );
  });
});

// ─── getPlayer ────────────────────────────────────────────────────────────────

describe('getPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when unauthenticated', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await getPlayer('player-1');
    expect(result).toBeNull();
  });

  it('returns player data when found', async () => {
    setupAdminChain();
    const playerData = {
      id: 'player-1',
      name: 'João',
      phone: '11999999999',
      weight_kg: 70,
      stamina: 'medium',
      is_star: false,
      is_banned: false,
      suspended_until: null,
      suspension_reason: null,
    };
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: playerData, error: null }),
    );
    const result = await getPlayer('player-1');
    expect(result).toEqual(playerData);
  });

  it('returns null when player not found', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await getPlayer('nonexistent');
    expect(result).toBeNull();
  });
});
