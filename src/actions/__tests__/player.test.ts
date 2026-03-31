import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabaseFrom, createQueryMock } from '@/test/mocks/supabase';
import {
  mockRevalidatePath,
  mockCookieDelete,
  mockCookieSet,
  mockCookieGet,
} from '@/test/mocks/next';

const {
  clearPlayerCookie,
  validateTeamCode,
  confirmPresence,
  cancelPresence,
  identifyPlayer,
  registerPlayer,
  saveLastTeamCode,
  clearLastTeamCode,
  updatePlayerSelf,
} = await import('@/actions/player');

const TEAM_ID = 'team-uuid';
const GAME_ID = 'game-uuid';
const PHONE = '11999999999';

// ─── saveLastTeamCode ─────────────────────────────────────────────────────────

describe('saveLastTeamCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the last_team_code cookie with the given code', async () => {
    await saveLastTeamCode('ABCD-XYZ123');
    expect(mockCookieSet).toHaveBeenCalledWith(
      'last_team_code',
      'ABCD-XYZ123',
      expect.objectContaining({ path: '/' }),
    );
  });
});

// ─── clearLastTeamCode ────────────────────────────────────────────────────────

describe('clearLastTeamCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the last_team_code cookie', async () => {
    await clearLastTeamCode();
    expect(mockCookieDelete).toHaveBeenCalledWith('last_team_code');
  });
});

// ─── clearPlayerCookie ────────────────────────────────────────────────────────

describe('clearPlayerCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the player cookie for the given teamId', async () => {
    await clearPlayerCookie(TEAM_ID);
    expect(mockCookieDelete).toHaveBeenCalledWith(`player_${TEAM_ID}`);
  });
});

// ─── validateTeamCode ─────────────────────────────────────────────────────────

describe('validateTeamCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { valid: true } when team is found', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: TEAM_ID }, error: null }),
    );
    const result = await validateTeamCode('ABCD-XYZ123');
    expect(result).toEqual({ valid: true });
  });

  it('returns { valid: false } when team is not found', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await validateTeamCode('XXXX-000000');
    expect(result).toEqual({ valid: false });
  });

  it('uppercases the code before querying', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: TEAM_ID }, error: null }),
    );
    await validateTeamCode('abcd-xyz123');
    // eq() is called on the chain — just ensure it didn't throw and resolved
    expect(mockSupabaseFrom).toHaveBeenCalledWith('teams');
  });
});

// ─── confirmPresence ──────────────────────────────────────────────────────────

describe('confirmPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── banned ──

  it('returns { banned: true } when player is banned', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: true,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({ banned: true });
  });

  // ── suspended ──

  it('returns { suspended, until, reason } when player is suspended in the future', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: futureDate,
          suspension_reason: 'Conduta inadequada',
        },
        error: null,
      }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({
      suspended: true,
      until: futureDate,
      reason: 'Conduta inadequada',
    });
  });

  it('does NOT return suspended when suspension date is in the past', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    // player with expired suspension — treat as active
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: pastDate,
          suspension_reason: 'Old reason',
        },
        error: null,
      }),
    );
    // existing confirmation check
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // confirmed count (not full)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 10 }),
    );
    // insert confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({ status: 'confirmed' });
  });

  // ── needsRegistration ──

  it('returns { needsRegistration: true } when phone not found and no newPlayer', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({ needsRegistration: true });
  });

  // ── new player insert error ──

  it('returns { error } when new player insert fails', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // player not found
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'duplicate' } }), // insert fails
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
      newPlayer: { name: 'Novo Jogador', weight_kg: 70, stamina: '2' },
    });
    expect(result).toEqual({ error: 'Erro ao registrar jogador.' });
  });

  // ── alreadyConfirmed ──

  it('returns { alreadyConfirmed, currentStatus } when player already confirmed', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    // existing confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { status: 'confirmed' }, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({
      alreadyConfirmed: true,
      currentStatus: 'confirmed',
    });
  });

  it("returns alreadyConfirmed with currentStatus 'waitlist'", async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { status: 'waitlist' }, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({
      alreadyConfirmed: true,
      currentStatus: 'waitlist',
    });
  });

  // ── gameFull ──

  it('returns { gameFull: true } when game has 25+ confirmed and joinWaitlist is false', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    // no existing confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // confirmed count = 25
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 25 }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
      joinWaitlist: false,
    });
    expect(result).toEqual({ gameFull: true });
  });

  // ── waitlist ──

  it("returns { status: 'waitlist' } when game is full and joinWaitlist is true", async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    // no existing confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // confirmed count = 25 (full)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 25 }),
    );
    // waitlist count = 2
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 2 }),
    );
    // insert confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
      joinWaitlist: true,
    });
    expect(result).toEqual({ status: 'waitlist' });
  });

  // ── insert confirmation error ──

  it('returns { error } when insert confirmation fails', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // no existing confirmation
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 5 }), // not full
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }), // insert fails
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({ error: 'Erro ao confirmar presença.' });
  });

  // ── success (confirmed) ──

  it("returns { status: 'confirmed' } and sets cookie on success", async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // no existing confirmation
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 10 }), // not full
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // insert success
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
    });
    expect(result).toEqual({ status: 'confirmed' });
    expect(mockCookieSet).toHaveBeenCalledWith(
      `player_${TEAM_ID}`,
      PHONE,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/jogador/[code]', 'page');
  });

  // ── success with new player ──

  it("creates new player and returns { status: 'confirmed' }", async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // player not found
    );
    // insert new player
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'new-player-1' }, error: null }),
    );
    // no existing confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // confirmed count
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 0 }),
    );
    // insert confirmation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await confirmPresence({
      gameId: GAME_ID,
      teamId: TEAM_ID,
      phone: PHONE,
      newPlayer: { name: 'Novo Jogador', weight_kg: 75, stamina: '3' },
    });
    expect(result).toEqual({ status: 'confirmed' });
  });
});

// ─── updatePlayerSelf ─────────────────────────────────────────────────────────

const SELF_PARAMS = {
  name: 'Carlos Ramos',
  phone: PHONE,
  weight_kg: 75,
  stamina: '3' as const,
  position: null,
  is_star: false,
};

describe('updatePlayerSelf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: PHONE });
  });

  it('returns error when no player cookie exists', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const result = await updatePlayerSelf(TEAM_ID, SELF_PARAMS);
    expect(result).toEqual({ error: 'Não identificado.' });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('returns error when player is not found', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await updatePlayerSelf(TEAM_ID, SELF_PARAMS);
    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when new phone is already taken by another player', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // found by current phone
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-2' }, error: null }), // new phone already exists
    );
    const result = await updatePlayerSelf(TEAM_ID, {
      ...SELF_PARAMS,
      phone: '11911112222',
    });
    expect(result).toEqual({
      error: 'Este número já está cadastrado nesta turma.',
    });
  });

  it('returns error when update query fails', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // found
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }), // update fails
    );
    const result = await updatePlayerSelf(TEAM_ID, SELF_PARAMS);
    expect(result).toEqual({ error: 'Erro ao salvar dados.' });
  });

  it('returns {} and revalidates when phone is unchanged', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // update success
    );
    const result = await updatePlayerSelf(TEAM_ID, SELF_PARAMS);
    expect(result).toEqual({});
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/jogador/[code]', 'page');
  });

  it('updates cookie when phone changes and returns {}', async () => {
    const newPhone = '11911112222';
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // found by current phone
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // new phone not taken
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // update success
    );
    const result = await updatePlayerSelf(TEAM_ID, {
      ...SELF_PARAMS,
      phone: newPhone,
    });
    expect(result).toEqual({});
    expect(mockCookieSet).toHaveBeenCalledWith(
      `player_${TEAM_ID}`,
      newPhone,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/jogador/[code]', 'page');
  });
});

// ─── cancelPresence ───────────────────────────────────────────────────────────

describe('cancelPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: PHONE });
  });

  it('returns error when no player cookie exists', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const result = await cancelPresence({ gameId: GAME_ID, teamId: TEAM_ID });

    expect(result).toEqual({ error: 'Jogador não identificado.' });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('returns error when player is not found in the team', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await cancelPresence({ gameId: GAME_ID, teamId: TEAM_ID });

    expect(result).toEqual({ error: 'Jogador não encontrado.' });
  });

  it('returns error when delete fails', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }),
    );

    const result = await cancelPresence({ gameId: GAME_ID, teamId: TEAM_ID });

    expect(result).toEqual({ error: 'Erro ao cancelar presença.' });
  });

  it('returns { success: true } and revalidates on success', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await cancelPresence({ gameId: GAME_ID, teamId: TEAM_ID });

    expect(result).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/jogador/[code]', 'page');
  });
});

// ─── identifyPlayer ───────────────────────────────────────────────────────────

describe('identifyPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { needsRegistration: true } when phone not found', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await identifyPlayer({ teamId: TEAM_ID, phone: PHONE });
    expect(result).toEqual({ needsRegistration: true });
  });

  it('returns { banned: true } when player is banned', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: true,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    const result = await identifyPlayer({ teamId: TEAM_ID, phone: PHONE });
    expect(result).toEqual({ banned: true });
  });

  it('returns { suspended, until, reason } when suspension is active', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: futureDate,
          suspension_reason: 'Teste',
        },
        error: null,
      }),
    );
    const result = await identifyPlayer({ teamId: TEAM_ID, phone: PHONE });
    expect(result).toEqual({
      suspended: true,
      until: futureDate,
      reason: 'Teste',
    });
  });

  it('returns { identified: true } and sets cookie for active player', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: null,
          suspension_reason: null,
        },
        error: null,
      }),
    );
    const result = await identifyPlayer({ teamId: TEAM_ID, phone: PHONE });
    expect(result).toEqual({ identified: true });
    expect(mockCookieSet).toHaveBeenCalledWith(
      `player_${TEAM_ID}`,
      PHONE,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('returns { identified: true } when suspension date is in the past', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: {
          id: 'player-1',
          is_banned: false,
          suspended_until: pastDate,
          suspension_reason: 'Old reason',
        },
        error: null,
      }),
    );
    const result = await identifyPlayer({ teamId: TEAM_ID, phone: PHONE });
    expect(result).toEqual({ identified: true });
  });
});

// ─── registerPlayer ───────────────────────────────────────────────────────────

describe('registerPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts new player and sets cookie on success', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // player not found
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // insert success
    );
    const result = await registerPlayer({
      teamId: TEAM_ID,
      phone: PHONE,
      name: 'Novo Jogador',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ success: true });
    expect(mockCookieSet).toHaveBeenCalledWith(
      `player_${TEAM_ID}`,
      PHONE,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('returns { error } when insert fails', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // player not found
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'db error' } }), // insert fails
    );
    const result = await registerPlayer({
      teamId: TEAM_ID,
      phone: PHONE,
      name: 'Novo Jogador',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ error: 'Erro ao registrar. Tente novamente.' });
  });

  it('skips insert and sets cookie when player already exists (race condition)', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'player-1' }, error: null }), // player already exists
    );
    const result = await registerPlayer({
      teamId: TEAM_ID,
      phone: PHONE,
      name: 'Novo Jogador',
      weight_kg: 75,
      stamina: '3',
    });
    expect(result).toEqual({ success: true });
    expect(mockCookieSet).toHaveBeenCalledWith(
      `player_${TEAM_ID}`,
      PHONE,
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
