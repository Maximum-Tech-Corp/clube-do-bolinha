import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from "@/test/mocks/supabase";
import { mockRevalidatePath } from "@/test/mocks/next";

// Keep mock fn references so we can reset them in beforeEach
const mockGetDrawInfo = vi.fn();
const mockRunDraw = vi.fn();
const mockBuildGroupMatchOrder = vi.fn();

vi.mock("@/lib/draw-algorithm", () => ({
  getDrawInfo: (...args: unknown[]) => mockGetDrawInfo(...args),
  runDraw: (...args: unknown[]) => mockRunDraw(...args),
}));

vi.mock("@/lib/tournament-utils", () => ({
  buildGroupMatchOrder: (...args: unknown[]) => mockBuildGroupMatchOrder(...args),
  computeStandings: vi.fn().mockReturnValue([]),
}));

const { executeDraw } = await import("@/actions/draw");

function setupAdminChain(teamId = "team-1") {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: "user-uuid" } },
    error: null,
  });
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: "admin-uuid" }, error: null })
  );
  mockSupabaseFrom.mockReturnValueOnce(
    createQueryMock({ data: { id: teamId }, error: null })
  );
}

function setupUnauthenticated() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

function setupDefaultDrawMocks() {
  mockGetDrawInfo.mockReturnValue({
    canDraw: true,
    canBeTournament: true,
    message: null,
    nTeams: 2,
    completeTeams: 2,
    hasPartialTeam: false,
    leftover: 0,
    isWarning: false,
  });
  mockRunDraw.mockReturnValue([
    [{ id: "p1", name: "P1", weight_kg: 70, stamina: "3", is_star: false }],
    [{ id: "p2", name: "P2", weight_kg: 70, stamina: "3", is_star: false }],
  ]);
  mockBuildGroupMatchOrder.mockReturnValue([["gt1", "gt2"]]);
}

// ─── executeDraw ──────────────────────────────────────────────────────────────

describe("executeDraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultDrawMocks();
  });

  it("returns unauthorized when no session", async () => {
    setupUnauthenticated();
    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Não autorizado." });
  });

  it("returns error when game not found", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Jogo não encontrado." });
  });

  it("returns error when game is not open", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "finished", draw_done: false },
        error: null,
      })
    );
    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Jogo não está aberto." });
  });

  it("returns error when draw already done", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: true },
        error: null,
      })
    );
    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Sorteio já realizado." });
  });

  it("returns error when no players confirmed", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false },
        error: null,
      })
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [], error: null })
    );

    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Nenhum jogador confirmado." });
  });

  it("returns error when players query returns null (lines 69-70)", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false },
        error: null,
      })
    );
    // confirmations with one player id
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [{ player_id: "p1" }], error: null })
    );
    // players query returns null
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await executeDraw("game-1", false);
    expect(result).toEqual({ error: "Erro ao buscar dados dos jogadores." });
  });

  it("inserts game_teams and game_team_players on success", async () => {
    setupAdminChain();
    // game check
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false },
        error: null,
      })
    );
    // confirmations
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [{ player_id: "p1" }, { player_id: "p2" }],
        error: null,
      })
    );
    // players
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: "p1", name: "P1", weight_kg: 70, stamina: "3", is_star: false },
          { id: "p2", name: "P2", weight_kg: 70, stamina: "3", is_star: false },
        ],
        error: null,
      })
    );
    // Team 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt1" }, error: null })
    );
    // Player 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Team 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt2" }, error: null })
    );
    // Player 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Mark draw_done
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await executeDraw("game-1", false);

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/jogos/game-1");
  });

  it("creates tournament matches when isTournament=true", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false },
        error: null,
      })
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [{ player_id: "p1" }, { player_id: "p2" }],
        error: null,
      })
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: "p1", name: "P1", weight_kg: 70, stamina: "3", is_star: false },
          { id: "p2", name: "P2", weight_kg: 70, stamina: "3", is_star: false },
        ],
        error: null,
      })
    );
    // Team 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt1" }, error: null })
    );
    // Player 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Team 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt2" }, error: null })
    );
    // Player 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Mark draw_done + is_tournament
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Fetch game_teams for tournament match creation
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [{ id: "gt1" }, { id: "gt2" }],
        error: null,
      })
    );
    // Guard: no existing group matches
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [], error: null })
    );
    // Insert tournament matches
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await executeDraw("game-1", true);

    expect(result).toEqual({});
  });

  it("skips match creation if group matches already exist (guard)", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false },
        error: null,
      })
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [{ player_id: "p1" }, { player_id: "p2" }],
        error: null,
      })
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: [
          { id: "p1", name: "P1", weight_kg: 70, stamina: "3", is_star: false },
          { id: "p2", name: "P2", weight_kg: 70, stamina: "3", is_star: false },
        ],
        error: null,
      })
    );
    // Team 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt1" }, error: null })
    );
    // Player 1 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Team 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "gt2" }, error: null })
    );
    // Player 2 insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Mark draw_done
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );
    // Fetch game_teams
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [{ id: "gt1" }, { id: "gt2" }], error: null })
    );
    // Guard: existing group matches found → skip insert
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: [{ id: "m1" }], error: null })
    );

    const result = await executeDraw("game-1", true);

    expect(result).toEqual({});
  });
});
