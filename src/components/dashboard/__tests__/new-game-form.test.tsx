import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewGameForm } from "../new-game-form";
import { mockPush } from "@/test/mocks/next";

const mockCreateGame = vi.fn();

vi.mock("@/actions/games-admin", () => ({
  createGame: (...args: unknown[]) => mockCreateGame(...args),
  cancelGame: vi.fn(),
  toggleTournament: vi.fn(),
  listGames: vi.fn(),
  removeConfirmedPlayer: vi.fn(),
  promoteWaitlistPlayer: vi.fn(),
  addPlayerToGame: vi.fn(),
  createAndAddPlayer: vi.fn(),
}));

// Helper: future datetime-local value (1 day from now)
function futureDateTimeValue() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // datetime-local format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

describe("NewGameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGame.mockResolvedValue({});
  });

  describe("rendering", () => {
    it("renders date/time field", () => {
      render(<NewGameForm />);
      expect(screen.getByLabelText("Data e horário")).toBeInTheDocument();
    });

    it("renders location field", () => {
      render(<NewGameForm />);
      expect(screen.getByLabelText("Local (opcional)")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<NewGameForm />);
      expect(screen.getByRole("button", { name: "Criar jogo" })).toBeInTheDocument();
    });

    it("submit button is disabled when date is empty", () => {
      render(<NewGameForm />);
      expect(screen.getByRole("button", { name: "Criar jogo" })).toBeDisabled();
    });
  });

  describe("submission", () => {
    it("enables submit button after datetime is filled", async () => {
      const user = userEvent.setup();
      render(<NewGameForm />);

      fireEvent.change(screen.getByLabelText("Data e horário"), {
        target: { value: futureDateTimeValue() },
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Criar jogo" })).not.toBeDisabled();
      });
    });

    it("calls createGame with ISO UTC string on submit", async () => {
      const user = userEvent.setup();
      render(<NewGameForm />);

      const futureVal = futureDateTimeValue();
      fireEvent.change(screen.getByLabelText("Data e horário"), {
        target: { value: futureVal },
      });
      await user.type(
        screen.getByLabelText("Local (opcional)"),
        "Quadra Municipal"
      );
      await user.click(screen.getByRole("button", { name: "Criar jogo" }));

      await waitFor(() => {
        expect(mockCreateGame).toHaveBeenCalledWith(
          expect.objectContaining({
            location: "Quadra Municipal",
            scheduled_at: expect.stringMatching(/Z$/), // ISO UTC ends with Z
          })
        );
      });
    });

    it("redirects to /dashboard/jogos on success", async () => {
      render(<NewGameForm />);

      fireEvent.change(screen.getByLabelText("Data e horário"), {
        target: { value: futureDateTimeValue() },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Criar jogo" }).closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard/jogos");
      });
    });

    it("shows error message when action fails", async () => {
      mockCreateGame.mockResolvedValue({ error: "A data e hora devem ser no futuro." });
      render(<NewGameForm />);

      fireEvent.change(screen.getByLabelText("Data e horário"), {
        target: { value: futureDateTimeValue() },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Criar jogo" }).closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("A data e hora devem ser no futuro.")
        ).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows 'Salvando...' loading state during submission", async () => {
      mockCreateGame.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 200))
      );
      render(<NewGameForm />);

      fireEvent.change(screen.getByLabelText("Data e horário"), {
        target: { value: futureDateTimeValue() },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Criar jogo" }).closest("form")!);

      // Button should show loading state immediately after submit
      expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
    });
  });
});
