import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRevalidatePath } from '@/test/mocks/next';

const mockComputeStandings = vi.fn();

vi.mock('@/lib/tournament-utils', () => ({
  computeStandings: (...args: unknown[]) => mockComputeStandings(...args),
  buildGroupMatchOrder: vi.fn().mockReturnValue([]),
}));

const { saveMatchResult, reopenMatch, generateNextPhase } =
  await import('@/actions/tournament');

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
    createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
  );
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: null, error: null }), // team not found
  );
}

// ─── saveMatchResult ──────────────────────────────────────────────────────────

describe('saveMatchResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeStandings.mockReturnValue([
      { teamId: 't1', teamNumber: 1, points: 9 },
      { teamId: 't2', teamNumber: 2, points: 6 },
      { teamId: 't3', teamNumber: 3, points: 3 },
      { teamId: 't4', teamNumber: 4, points: 0 },
    ]);
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns unauthorized when admin not found (line 21)', async () => {
    setupAdminNotFound();
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns unauthorized when team not found (line 29)', async () => {
    setupTeamNotFound();
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when match not found via game lookup', async () => {
    setupAdminChain();
    // getMatchGameId: match not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Partida não encontrada.' });
  });

  it('returns unauthorized when ownership check fails', async () => {
    setupAdminChain();
    // getMatchGameId: returns game_id
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    // assertOwnership: not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when match row not found after auth checks (line 83)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // match lookup returns null
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Partida não encontrada.' });
  });

  it('returns error when update fails (line 95)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'match-1', completed: false },
        error: null,
      }),
    );
    // update fails
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }),
    );
    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Erro ao salvar resultado.' });
  });

  it('returns error when match is already completed', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // match check: already completed
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'match-1', completed: true },
        error: null,
      }),
    );

    const result = await saveMatchResult('match-1', 2, 1);
    expect(result).toEqual({ error: 'Partida já finalizada.' });
  });

  it('updates match scores and marks completed on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // match: not completed
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'match-1', completed: false },
        error: null,
      }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await saveMatchResult('match-1', 3, 2);

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogos/game-1/campeonato',
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogos/game-1/times',
    );
  });
});

// ─── reopenMatch ──────────────────────────────────────────────────────────────

describe('reopenMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeStandings.mockReturnValue([]);
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await reopenMatch('match-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when match game not found (line 112)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // getMatchGameId returns null
    );
    const result = await reopenMatch('match-1');
    expect(result).toEqual({ error: 'Partida não encontrada.' });
  });

  it('returns unauthorized when ownership fails (lines 114-115)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }), // ownership fails
    );
    const result = await reopenMatch('match-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when update fails (line 124)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'update error' } }),
    );
    const result = await reopenMatch('match-1');
    expect(result).toEqual({ error: 'Erro ao reabrir partida.' });
  });

  it('clears scores and marks not completed on success', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await reopenMatch('match-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogos/game-1/campeonato',
    );
  });
});

// ─── generateNextPhase ────────────────────────────────────────────────────────

describe('generateNextPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeStandings.mockReturnValue([
      { teamId: 't1', teamNumber: 1, points: 9 },
      { teamId: 't2', teamNumber: 2, points: 6 },
      { teamId: 't3', teamNumber: 3, points: 3 },
      { teamId: 't4', teamNumber: 4, points: 0 },
    ]);
  });

  it('returns unauthorized when no session', async () => {
    setupUnauthenticated();
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when ownership check fails', async () => {
    setupAdminChain();
    // assertOwnership fails
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('handles null gameTeamsRaw with ?? [] (line 161)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // Promise.all: gameTeams null, matches []
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [], error: null }),
    );
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Campeonato requer 4 ou 5 times.' });
  });

  it('handles null matchesRaw with ?? [] (line 162)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // Promise.all: gameTeams with 4 teams, matches null
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Fase de grupos não concluída.' });
  });

  it('returns error when nTeams is not 4 or 5', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // game_teams: 3 teams
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
        ],
        error: null,
      }),
    );
    // matches
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [], error: null }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Campeonato requer 4 ou 5 times.' });
  });

  it('returns error when group phase not complete', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // 4 teams
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    // group phase incomplete
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          {
            id: 'm1',
            phase: 'group',
            home_team_id: 't1',
            away_team_id: 't2',
            home_score: null,
            away_score: null,
            match_order: 1,
            completed: false,
          },
        ],
        error: null,
      }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Fase de grupos não concluída.' });
  });

  it('generates semis for 4-team tournament after group phase', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    // all 6 group matches completed
    const completedMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: completedMatches, error: null }),
    );
    // insert semis
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogos/game-1/campeonato',
    );
  });

  it('returns error when semis not complete for 4-team (semi→final path)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    // 6 group matches complete + 2 semi matches NOT complete
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: null,
        away_score: null,
        match_order: 1,
        completed: false,
      },
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: null,
        away_score: null,
        match_order: 2,
        completed: false,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...semiMatches], error: null }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Semifinais não concluídas.' });
  });

  it('returns error when final already generated for 4-team tournament', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: 2,
        away_score: 1,
        match_order: 1,
        completed: true,
      },
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 1,
        away_score: 0,
        match_order: 2,
        completed: true,
      },
    ];
    const finalMatch = [
      {
        id: 'f1',
        phase: 'final',
        home_team_id: 't1',
        away_team_id: 't2',
        home_score: null,
        away_score: null,
        match_order: 1,
        completed: false,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [...groupMatches, ...semiMatches, ...finalMatch],
        error: null,
      }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Final já gerada.' });
  });

  it('generates final for 4-team tournament after semis are complete', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: 2,
        away_score: 1,
        match_order: 1,
        completed: true,
      },
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 0,
        away_score: 1,
        match_order: 2,
        completed: true,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...semiMatches], error: null }),
    );
    // insert final
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      '/dashboard/jogos/game-1/campeonato',
    );
  });

  it('generates final when away team wins semi1 (line 242)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      // away wins semi1 → covers line 242
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: 0,
        away_score: 2,
        match_order: 1,
        completed: true,
      },
      // away wins semi2 → covers line 246
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 0,
        away_score: 1,
        match_order: 2,
        completed: true,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...semiMatches], error: null }),
    );
    // insert final
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');
    expect(result).toEqual({});
  });

  it('uses ?? 0 fallback when semi scores are null (lines 240, 245)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      // null scores → ?? 0 → 0 >= 0 → home wins
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: null,
        away_score: null,
        match_order: 1,
        completed: true,
      },
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: null,
        away_score: null,
        match_order: 2,
        completed: true,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...semiMatches], error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({});
  });

  it('generates final when home team wins semi2 (line 246)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 6 }, (_, i) => ({
      id: `gm${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const semiMatches = [
      {
        id: 's1',
        phase: 'semi',
        home_team_id: 't1',
        away_team_id: 't4',
        home_score: 0,
        away_score: 2,
        match_order: 1,
        completed: true,
      },
      // home wins semi2 → covers line 246
      {
        id: 's2',
        phase: 'semi',
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 2,
        away_score: 0,
        match_order: 2,
        completed: true,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...semiMatches], error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');

    expect(result).toEqual({});
  });

  it('returns error when group not complete for 5-team tournament (line 182)', async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
          { id: 't5', team_number: 5 },
        ],
        error: null,
      }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          {
            id: 'm1',
            phase: 'group',
            home_team_id: 't1',
            away_team_id: 't2',
            home_score: null,
            away_score: null,
            match_order: 1,
            completed: false,
          },
        ],
        error: null,
      }),
    );
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Fase de grupos não concluída.' });
  });

  it('returns error when final already generated for 5-team tournament (line 183)', async () => {
    mockComputeStandings.mockReturnValue([
      { teamId: 't1', teamNumber: 1, points: 12 },
      { teamId: 't2', teamNumber: 2, points: 9 },
    ]);
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
          { id: 't5', team_number: 5 },
        ],
        error: null,
      }),
    );
    const groupMatches = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    const finalMatch = [
      {
        id: 'f1',
        phase: 'final',
        home_team_id: 't1',
        away_team_id: 't2',
        home_score: null,
        away_score: null,
        match_order: 1,
        completed: false,
      },
    ];
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [...groupMatches, ...finalMatch], error: null }),
    );
    const result = await generateNextPhase('game-1');
    expect(result).toEqual({ error: 'Final já gerada.' });
  });

  it('generates final for 5-team tournament after group phase', async () => {
    mockComputeStandings.mockReturnValue([
      { teamId: 't1', teamNumber: 1, points: 12 },
      { teamId: 't2', teamNumber: 2, points: 9 },
      { teamId: 't3', teamNumber: 3, points: 6 },
      { teamId: 't4', teamNumber: 4, points: 3 },
      { teamId: 't5', teamNumber: 5, points: 0 },
    ]);

    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'game-1' }, error: null }),
    );
    // 5 teams
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: 't1', team_number: 1 },
          { id: 't2', team_number: 2 },
          { id: 't3', team_number: 3 },
          { id: 't4', team_number: 4 },
          { id: 't5', team_number: 5 },
        ],
        error: null,
      }),
    );
    // 10 group matches all completed
    const groupMatches = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: 1,
      away_score: 0,
      match_order: i + 1,
      completed: true,
    }));
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: groupMatches, error: null }),
    );
    // insert final
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await generateNextPhase('game-1');

    expect(result).toEqual({});
  });
});
