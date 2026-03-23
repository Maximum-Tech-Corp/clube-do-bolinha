import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from "@/test/mocks/supabase";
import { mockRevalidatePath } from "@/test/mocks/next";

const { updateStat, finishGame } = await import("@/actions/game-stats");

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

// ─── updateStat ───────────────────────────────────────────────────────────────

describe("updateStat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session", async () => {
    setupUnauthenticated();
    const result = await updateStat("gtp-1", "goals", 1);
    expect(result).toEqual({ error: "Não autorizado." });
  });

  it("returns error when game_team_player not found", async () => {
    setupAdminChain();
    // gtp not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "goals", 1);
    expect(result).toEqual({ error: "Registro não encontrado." });
  });

  it("returns error when game_team not found", async () => {
    setupAdminChain();
    // gtp found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 2, assists: 0, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "goals", 1);
    expect(result).toEqual({ error: "Time não encontrado." });
  });

  it("returns error when game not found or not in team", async () => {
    setupAdminChain();
    // gtp
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 2, assists: 0, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: "game-1" }, error: null })
    );
    // game not found for this team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "goals", 1);
    expect(result).toEqual({ error: "Jogo não encontrado." });
  });

  it("returns error when game is already finished", async () => {
    setupAdminChain();
    // gtp
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 2, assists: 0, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: "game-1" }, error: null })
    );
    // game: finished
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "game-1", status: "finished" }, error: null })
    );

    const result = await updateStat("gtp-1", "goals", 1);
    expect(result).toEqual({ error: "Jogo já finalizado." });
  });

  it("increments goals and returns new value", async () => {
    setupAdminChain();
    // gtp: 2 goals
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 2, assists: 0, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: "game-1" }, error: null })
    );
    // game: open
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "game-1", status: "open" }, error: null })
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "goals", 1);

    expect(result).toEqual({ newValue: 3 }); // 2 + 1
  });

  it("decrements goals but never below 0", async () => {
    setupAdminChain();
    // gtp: 0 goals
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 0, assists: 0, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: "game-1" }, error: null })
    );
    // game: open
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "game-1", status: "open" }, error: null })
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "goals", -1);

    expect(result).toEqual({ newValue: 0 }); // max(0, 0-1) = 0
  });

  it("updates assists field", async () => {
    setupAdminChain();
    // gtp: 1 assist
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "gtp-1", goals: 0, assists: 1, game_team_id: "gt-1" },
        error: null,
      })
    );
    // game_team
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { game_id: "game-1" }, error: null })
    );
    // game: open
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: "game-1", status: "open" }, error: null })
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await updateStat("gtp-1", "assists", 1);

    expect(result).toEqual({ newValue: 2 }); // 1 + 1
  });
});

// ─── finishGame ───────────────────────────────────────────────────────────────

describe("finishGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session", async () => {
    setupUnauthenticated();
    const result = await finishGame("game-1");
    expect(result).toEqual({ error: "Não autorizado." });
  });

  it("returns error when game not found", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await finishGame("game-1");
    expect(result).toEqual({ error: "Jogo não encontrado." });
  });

  it("returns error when game is not open", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "finished", draw_done: true, is_tournament: false },
        error: null,
      })
    );

    const result = await finishGame("game-1");
    expect(result).toEqual({ error: "Jogo não está aberto." });
  });

  it("returns error when draw not done", async () => {
    setupAdminChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: false, is_tournament: false },
        error: null,
      })
    );

    const result = await finishGame("game-1");
    expect(result).toEqual({ error: "Sorteio ainda não foi realizado." });
  });

  it("finishes game and revalidates paths", async () => {
    setupAdminChain();
    // game
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: true, is_tournament: false },
        error: null,
      })
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await finishGame("game-1");

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/jogos/game-1/times");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/jogos/game-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/jogos");
  });

  it("returns error when tournament not all matches completed", async () => {
    setupAdminChain();
    // game: is_tournament=true
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: true, is_tournament: true },
        error: null,
      })
    );
    // total matches count: 6
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 6 })
    );
    // completed count: 4 (not all)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 4 })
    );

    const result = await finishGame("game-1");
    expect(result).toEqual({
      error: "Finalize o campeonato antes de encerrar o jogo.",
    });
  });

  it("finishes tournament game when all matches completed", async () => {
    setupAdminChain();
    // game: is_tournament=true
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: "game-1", status: "open", draw_done: true, is_tournament: true },
        error: null,
      })
    );
    // total matches: 6
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 6 })
    );
    // completed: 6 (all done)
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null, count: 6 })
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null })
    );

    const result = await finishGame("game-1");
    expect(result).toEqual({});
  });
});
