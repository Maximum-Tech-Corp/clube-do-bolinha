import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentClient } from "../tournament-client";

const mockSaveMatchResult = vi.fn();
const mockReopenMatch = vi.fn();
const mockGenerateNextPhase = vi.fn();

vi.mock("@/actions/tournament", () => ({
  saveMatchResult: (...args: unknown[]) => mockSaveMatchResult(...args),
  reopenMatch: (...args: unknown[]) => mockReopenMatch(...args),
  generateNextPhase: (...args: unknown[]) => mockGenerateNextPhase(...args),
}));

const TEAMS = [
  { id: "t1", teamNumber: 1 },
  { id: "t2", teamNumber: 2 },
  { id: "t3", teamNumber: 3 },
  { id: "t4", teamNumber: 4 },
];

const SEMI_MATCHES = [
  { id: "s1", phase: "semi" as const, homeTeamId: "t1", awayTeamId: "t4", homeScore: null, awayScore: null, matchOrder: 1, completed: false },
  { id: "s2", phase: "semi" as const, homeTeamId: "t2", awayTeamId: "t3", homeScore: null, awayScore: null, matchOrder: 2, completed: false },
];

const COMPLETED_SEMIS = [
  { id: "s1", phase: "semi" as const, homeTeamId: "t1", awayTeamId: "t4", homeScore: 2, awayScore: 1, matchOrder: 1, completed: true },
  { id: "s2", phase: "semi" as const, homeTeamId: "t2", awayTeamId: "t3", homeScore: 1, awayScore: 0, matchOrder: 2, completed: true },
];

const FINAL_MATCH = [
  { id: "f1", phase: "final" as const, homeTeamId: "t1", awayTeamId: "t2", homeScore: null, awayScore: null, matchOrder: 1, completed: false },
];

const GROUP_MATCHES_INCOMPLETE = [
  { id: "m1", phase: "group" as const, homeTeamId: "t1", awayTeamId: "t2", homeScore: null, awayScore: null, matchOrder: 1, completed: false },
  { id: "m2", phase: "group" as const, homeTeamId: "t3", awayTeamId: "t4", homeScore: null, awayScore: null, matchOrder: 2, completed: false },
];

const GROUP_MATCHES_COMPLETE = [
  { id: "m1", phase: "group" as const, homeTeamId: "t1", awayTeamId: "t2", homeScore: 2, awayScore: 1, matchOrder: 1, completed: true },
  { id: "m2", phase: "group" as const, homeTeamId: "t3", awayTeamId: "t4", homeScore: 1, awayScore: 1, matchOrder: 2, completed: true },
  { id: "m3", phase: "group" as const, homeTeamId: "t1", awayTeamId: "t3", homeScore: 3, awayScore: 0, matchOrder: 3, completed: true },
  { id: "m4", phase: "group" as const, homeTeamId: "t2", awayTeamId: "t4", homeScore: 2, awayScore: 2, matchOrder: 4, completed: true },
  { id: "m5", phase: "group" as const, homeTeamId: "t1", awayTeamId: "t4", homeScore: 1, awayScore: 0, matchOrder: 5, completed: true },
  { id: "m6", phase: "group" as const, homeTeamId: "t2", awayTeamId: "t3", homeScore: 0, awayScore: 1, matchOrder: 6, completed: true },
];

const STANDINGS = [
  { teamId: "t1", teamNumber: 1, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 6, goalsAgainst: 2, goalDiff: 4, points: 9 },
  { teamId: "t3", teamNumber: 3, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 4, goalDiff: -2, points: 4 },
  { teamId: "t2", teamNumber: 2, played: 3, wins: 0, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 5, goalDiff: -2, points: 1 },
  { teamId: "t4", teamNumber: 4, played: 3, wins: 0, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 3, goalDiff: 0, points: 1 },
];

const EMPTY_STANDINGS = TEAMS.map((t) => ({
  teamId: t.id,
  teamNumber: t.teamNumber,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
}));

describe("TournamentClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveMatchResult.mockResolvedValue({});
    mockReopenMatch.mockResolvedValue({});
    mockGenerateNextPhase.mockResolvedValue({});
  });

  describe("group phase rendering", () => {
    it("shows 'Nenhuma partida encontrada' when no matches", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={[]}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Nenhuma partida encontrada.")).toBeInTheDocument();
    });

    it("renders group phase section with matches", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Fase de Grupos")).toBeInTheDocument();
    });

    it("shows team names in match cards", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Time 1 × Time 2")).toBeInTheDocument();
      expect(screen.getByText("Time 3 × Time 4")).toBeInTheDocument();
    });

    it("shows score inputs for incomplete matches", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      // Each match has 2 score inputs
      const scoreInputs = screen.getAllByRole("spinbutton");
      expect(scoreInputs.length).toBeGreaterThanOrEqual(2);
    });

    it("shows 'Confirmar' buttons for incomplete matches", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      const confirmButtons = screen.getAllByRole("button", { name: "Confirmar" });
      expect(confirmButtons.length).toBe(2);
    });

    it("shows locked score for completed matches", () => {
      const completedMatch = [
        { ...GROUP_MATCHES_INCOMPLETE[0], homeScore: 2, awayScore: 1, completed: true },
      ];
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={completedMatch}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      // Score displayed as "2 × 1"
      expect(screen.getByText("2 × 1")).toBeInTheDocument();
    });

    it("shows 'Reabrir' button for completed matches", () => {
      const completedMatch = [
        { ...GROUP_MATCHES_INCOMPLETE[0], homeScore: 2, awayScore: 1, completed: true },
      ];
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={completedMatch}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByRole("button", { name: "Reabrir" })).toBeInTheDocument();
    });

    it("does not show 'Reabrir' button when game is finished", () => {
      const completedMatch = [
        { ...GROUP_MATCHES_INCOMPLETE[0], homeScore: 2, awayScore: 1, completed: true },
      ];
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={completedMatch}
          standings={STANDINGS}
          isFinished={true}
        />
      );
      expect(screen.queryByRole("button", { name: "Reabrir" })).not.toBeInTheDocument();
    });
  });

  describe("standings table", () => {
    it("does not show standings table content when no matches have been played", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      // StandingsTable returns null when all standings have played=0
      // The "Pts" column header only appears inside the table
      expect(screen.queryByText("Pts")).not.toBeInTheDocument();
    });

    it("shows standings table when matches have been played", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_COMPLETE}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Classificação")).toBeInTheDocument();
    });

    it("shows correct column headers in standings", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_COMPLETE}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Pts")).toBeInTheDocument();
      expect(screen.getByText("SG")).toBeInTheDocument();
    });
  });

  describe("save match result", () => {
    it("calls saveMatchResult with match id and scores", async () => {
      const user = userEvent.setup();
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );

      const scoreInputs = screen.getAllByRole("spinbutton");
      // Fill home and away scores for first match
      fireEvent.change(scoreInputs[0], { target: { value: "2" } });
      fireEvent.change(scoreInputs[1], { target: { value: "1" } });

      const confirmButtons = screen.getAllByRole("button", { name: "Confirmar" });
      await user.click(confirmButtons[0]);

      await waitFor(() => {
        expect(mockSaveMatchResult).toHaveBeenCalledWith("m1", 2, 1);
      });
    });

    it("shows error when saveMatchResult fails", async () => {
      mockSaveMatchResult.mockResolvedValue({ error: "Partida já finalizada." });
      const user = userEvent.setup();
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );

      const scoreInputs = screen.getAllByRole("spinbutton");
      fireEvent.change(scoreInputs[0], { target: { value: "1" } });
      fireEvent.change(scoreInputs[1], { target: { value: "0" } });

      const confirmButtons = screen.getAllByRole("button", { name: "Confirmar" });
      await user.click(confirmButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Partida já finalizada.")).toBeInTheDocument();
      });
    });
  });

  describe("generate next phase", () => {
    it("shows 'Gerar Semifinais' button when group phase is complete (4 teams)", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_COMPLETE}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(
        screen.getByRole("button", { name: "Gerar Semifinais" })
      ).toBeInTheDocument();
    });

    it("does not show generate button when group phase is incomplete", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_INCOMPLETE}
          standings={EMPTY_STANDINGS}
          isFinished={false}
        />
      );
      expect(
        screen.queryByRole("button", { name: /gerar/i })
      ).not.toBeInTheDocument();
    });

    it("calls generateNextPhase with gameId on click", async () => {
      const user = userEvent.setup();
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_COMPLETE}
          standings={STANDINGS}
          isFinished={false}
        />
      );

      await user.click(screen.getByRole("button", { name: "Gerar Semifinais" }));

      await waitFor(() => {
        expect(mockGenerateNextPhase).toHaveBeenCalledWith("game-1");
      });
    });

    it("shows error when generateNextPhase fails", async () => {
      mockGenerateNextPhase.mockResolvedValue({
        error: "Fase de grupos não concluída.",
      });
      const user = userEvent.setup();
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={GROUP_MATCHES_COMPLETE}
          standings={STANDINGS}
          isFinished={false}
        />
      );

      await user.click(screen.getByRole("button", { name: "Gerar Semifinais" }));

      await waitFor(() => {
        expect(
          screen.getByText("Fase de grupos não concluída.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("semi and final phases", () => {
    it("renders 'Semifinais' section when semi matches exist (lines 344-352)", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={[...GROUP_MATCHES_COMPLETE, ...SEMI_MATCHES]}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Semifinais")).toBeInTheDocument();
    });

    it("renders 'Final' section when final match exists (lines 357-365)", () => {
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={[...GROUP_MATCHES_COMPLETE, ...COMPLETED_SEMIS, ...FINAL_MATCH]}
          standings={STANDINGS}
          isFinished={false}
        />
      );
      expect(screen.getByText("Final")).toBeInTheDocument();
    });
  });

  describe("reopen match", () => {
    it("calls reopenMatch when Reabrir is clicked", async () => {
      const user = userEvent.setup();
      const completedMatch = [
        { ...GROUP_MATCHES_INCOMPLETE[0], homeScore: 2, awayScore: 1, completed: true },
      ];
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={completedMatch}
          standings={STANDINGS}
          isFinished={false}
        />
      );

      await user.click(screen.getByRole("button", { name: "Reabrir" }));

      await waitFor(() => {
        expect(mockReopenMatch).toHaveBeenCalledWith("m1");
      });
    });

    it("shows error when reopenMatch fails (lines 292-294)", async () => {
      mockReopenMatch.mockResolvedValue({ error: "Erro ao reabrir partida." });
      const user = userEvent.setup();
      const completedMatch = [
        { ...GROUP_MATCHES_INCOMPLETE[0], homeScore: 2, awayScore: 1, completed: true },
      ];
      render(
        <TournamentClient
          gameId="game-1"
          nTeams={4}
          teams={TEAMS}
          matches={completedMatch}
          standings={STANDINGS}
          isFinished={false}
        />
      );

      await user.click(screen.getByRole("button", { name: "Reabrir" }));

      await waitFor(() => {
        expect(screen.getByText("Erro ao reabrir partida.")).toBeInTheDocument();
      });
    });
  });
});
