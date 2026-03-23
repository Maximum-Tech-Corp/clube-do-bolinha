import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrawModal } from "../draw-modal";
import { mockPush } from "@/test/mocks/next";

const mockExecuteDraw = vi.fn();

vi.mock("@/actions/draw", () => ({
  executeDraw: (...args: unknown[]) => mockExecuteDraw(...args),
}));

// Mock Radix Dialog — render content only when open=true
vi.mock("@/components/ui/dialog", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    Dialog: ({
      children,
      open,
    }: {
      children: unknown;
      open: boolean;
    }) => (open ? React.createElement(React.Fragment, null, children) : null),
    DialogContent: ({ children }: { children: unknown }) =>
      React.createElement("div", { "data-testid": "dialog-content" }, children),
    DialogHeader: ({ children }: { children: unknown }) =>
      React.createElement("div", null, children),
    DialogTitle: ({ children }: { children: unknown }) =>
      React.createElement("h2", null, children),
    DialogDescription: ({ children }: { children: unknown }) =>
      React.createElement("p", null, children),
  };
});

function renderOpen(confirmedCount: number) {
  return render(
    <DrawModal
      gameId="game-1"
      confirmedCount={confirmedCount}
      open={true}
      onOpenChange={vi.fn()}
    />
  );
}

describe("DrawModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteDraw.mockResolvedValue({});
  });

  describe("rendering (closed)", () => {
    it("renders nothing when closed", () => {
      render(
        <DrawModal
          gameId="game-1"
          confirmedCount={15}
          open={false}
          onOpenChange={vi.fn()}
        />
      );
      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });
  });

  describe("rendering (open)", () => {
    it("shows confirmed player count", () => {
      renderOpen(15);
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("shows team breakdown for 15 players (3 teams of 5)", () => {
      renderOpen(15);
      // "3 × 5 jogadores" text
      expect(screen.getByText(/5 jogadores/)).toBeInTheDocument();
    });

    it("shows total teams count", () => {
      renderOpen(15);
      // getDrawInfo(15) → nTeams=3, shown in "Total de times" row
      expect(screen.getByText("Times completos")).toBeInTheDocument();
    });

    it("renders confirm and cancel buttons", () => {
      renderOpen(15);
      expect(
        screen.getByRole("button", { name: "Confirmar e Sortear" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancelar" })
      ).toBeInTheDocument();
    });
  });

  describe("partial team display", () => {
    it("shows 'Time incompleto' row when hasPartialTeam is true (18 players)", () => {
      renderOpen(18); // 18 % 5 = 3 → hasPartialTeam=true
      expect(screen.getByText("Time incompleto")).toBeInTheDocument();
    });

    it("shows warning message when isWarning is true (18 players)", () => {
      renderOpen(18);
      expect(screen.getByText(/time incompleto com 3 jogadores/i)).toBeInTheDocument();
    });
  });

  describe("tournament checkbox", () => {
    it("tournament checkbox is disabled for 15 players (canBeTournament=false)", () => {
      renderOpen(15); // 3 teams → cannot be tournament (need 4 or 5)
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
    });

    it("tournament checkbox is enabled for 20 players (canBeTournament=true)", () => {
      renderOpen(20); // 4 teams → can be tournament
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeDisabled();
    });

    it("tournament checkbox is unchecked by default", () => {
      renderOpen(20);
      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("can check the tournament checkbox when enabled", async () => {
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("checkbox"));

      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe("submission", () => {
    it("calls executeDraw with gameId and isTournament=false by default", async () => {
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("button", { name: "Confirmar e Sortear" }));

      await waitFor(() => {
        expect(mockExecuteDraw).toHaveBeenCalledWith("game-1", false);
      });
    });

    it("calls executeDraw with isTournament=true when checkbox is checked", async () => {
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: "Confirmar e Sortear" }));

      await waitFor(() => {
        expect(mockExecuteDraw).toHaveBeenCalledWith("game-1", true);
      });
    });

    it("redirects to /dashboard/jogos/:id/times on success", async () => {
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("button", { name: "Confirmar e Sortear" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard/jogos/game-1/times");
      });
    });

    it("shows error message on failure", async () => {
      mockExecuteDraw.mockResolvedValue({ error: "Sorteio já realizado." });
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("button", { name: "Confirmar e Sortear" }));

      await waitFor(() => {
        expect(screen.getByText("Sorteio já realizado.")).toBeInTheDocument();
      });
    });

    it("shows 'Sorteando...' loading state during execution", async () => {
      mockExecuteDraw.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 200))
      );
      const user = userEvent.setup();
      renderOpen(20);

      await user.click(screen.getByRole("button", { name: "Confirmar e Sortear" }));

      expect(screen.getByRole("button", { name: "Sorteando..." })).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Confirmar e Sortear" })
        ).toBeInTheDocument();
      });
    });
  });
});
