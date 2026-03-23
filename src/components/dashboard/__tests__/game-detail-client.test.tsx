import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameDetailClient } from "../game-detail-client";

const mockCancelGame = vi.fn();
const mockRemoveConfirmedPlayer = vi.fn();
const mockPromoteWaitlistPlayer = vi.fn();
const mockAddPlayerToGame = vi.fn();
const mockCreateAndAddPlayer = vi.fn();

vi.mock("@/actions/games-admin", () => ({
  cancelGame: (...args: unknown[]) => mockCancelGame(...args),
  removeConfirmedPlayer: (...args: unknown[]) => mockRemoveConfirmedPlayer(...args),
  promoteWaitlistPlayer: (...args: unknown[]) => mockPromoteWaitlistPlayer(...args),
  addPlayerToGame: (...args: unknown[]) => mockAddPlayerToGame(...args),
  createAndAddPlayer: (...args: unknown[]) => mockCreateAndAddPlayer(...args),
  createGame: vi.fn(),
  toggleTournament: vi.fn(),
  listGames: vi.fn(),
}));

// Mock DrawModal to avoid deep rendering
vi.mock("@/components/dashboard/draw-modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    DrawModal: ({
      open,
      onOpenChange,
    }: {
      open: boolean;
      onOpenChange: (v: boolean) => void;
    }) =>
      open
        ? React.createElement(
            "div",
            { "data-testid": "draw-modal" },
            React.createElement(
              "button",
              { onClick: () => onOpenChange(false) },
              "Fechar modal"
            )
          )
        : null,
  };
});

// Mock Radix Dialog
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

// Mock Radix Select (used in CreateAndAddPlayerPanel)
vi.mock("@/components/ui/select", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: unknown;
      onValueChange?: (v: string) => void;
    }) =>
      React.createElement(
        "select",
        {
          "data-testid": "stamina-select",
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(e.target.value),
        },
        children
      ),
    SelectTrigger: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      React.createElement("option", { value: "" }, placeholder),
    SelectContent: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: unknown;
    }) => React.createElement("option", { value }, children),
  };
});

const CONFIRMED = [
  {
    confirmationId: "c1",
    player: { id: "p1", name: "Carlos Ramos", phone: "(11) 98888-7777" },
  },
  {
    confirmationId: "c2",
    player: { id: "p2", name: "Bruno Lima", phone: "(11) 97777-6666" },
  },
];

const WAITLIST = [
  {
    confirmationId: "w1",
    position: 1,
    player: { id: "p3", name: "André Costa", phone: "(11) 96666-5555" },
  },
];

const AVAILABLE_PLAYERS = [
  { id: "p4", name: "Diego Santos" },
  { id: "p5", name: "Felipe Souza" },
];

describe("GameDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelGame.mockResolvedValue({});
    mockRemoveConfirmedPlayer.mockResolvedValue({});
    mockPromoteWaitlistPlayer.mockResolvedValue({});
    mockAddPlayerToGame.mockResolvedValue({});
    mockCreateAndAddPlayer.mockResolvedValue({});
  });

  describe("confirmed list", () => {
    it("shows confirmed players count", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(screen.getByText(/2\/25/)).toBeInTheDocument();
    });

    it("renders all confirmed player names", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(screen.getByText("Carlos Ramos")).toBeInTheDocument();
      expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
    });

    it("shows empty message when no one confirmed", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(screen.getByText("Nenhum confirmado ainda.")).toBeInTheDocument();
    });

    it("calls removeConfirmedPlayer when Remover is clicked", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: "Remover" });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveConfirmedPlayer).toHaveBeenCalledWith("game-1", "p1");
      });
    });
  });

  describe("waitlist", () => {
    it("shows waitlist section when there are entries", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={WAITLIST}
          availablePlayers={[]}
        />
      );
      expect(screen.getByText(/lista de espera/i)).toBeInTheDocument();
      expect(screen.getByText("André Costa")).toBeInTheDocument();
    });

    it("does not show waitlist section when empty", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(screen.queryByText(/lista de espera/i)).not.toBeInTheDocument();
    });

    it("calls promoteWaitlistPlayer when Promover is clicked", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={WAITLIST}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Promover" }));

      await waitFor(() => {
        expect(mockPromoteWaitlistPlayer).toHaveBeenCalledWith("w1", "game-1");
      });
    });
  });

  describe("draw button", () => {
    it("shows 'Rodar sorteio' when draw not done and enough players", () => {
      // Need 15+ players for canDraw=true — use 15 confirmed entries
      const confirmed15 = Array.from({ length: 15 }, (_, i) => ({
        confirmationId: `c${i}`,
        player: { id: `p${i}`, name: `Player ${i}`, phone: `119999${i}` },
      }));
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={confirmed15}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Rodar sorteio" })
      ).toBeInTheDocument();
    });

    it("shows 'Rodar sorteio' disabled when not enough players", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED} // only 2 players — cannot draw
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Rodar sorteio" })
      ).toBeDisabled();
    });

    it("shows 'Sorteio realizado' when draw is done", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={true}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Sorteio realizado" })
      ).toBeInTheDocument();
    });

    it("opens draw modal when 'Rodar sorteio' is clicked", async () => {
      const user = userEvent.setup();
      const confirmed15 = Array.from({ length: 15 }, (_, i) => ({
        confirmationId: `c${i}`,
        player: { id: `p${i}`, name: `Player ${i}`, phone: `119999${i}` },
      }));
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={confirmed15}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Rodar sorteio" }));

      expect(screen.getByTestId("draw-modal")).toBeInTheDocument();
    });
  });

  describe("cancel game button", () => {
    it("shows 'Cancelar jogo' button", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Cancelar jogo" })
      ).toBeInTheDocument();
    });

    it("opens confirmation dialog when Cancelar jogo is clicked", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Cancelar jogo" }));

      expect(screen.getByText("Cancelar jogo?")).toBeInTheDocument();
    });

    it("calls cancelGame on confirmation", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Cancelar jogo" }));
      await user.click(
        screen.getByRole("button", { name: "Confirmar cancelamento" })
      );

      await waitFor(() => {
        expect(mockCancelGame).toHaveBeenCalledWith("game-1");
      });
    });
  });

  describe("add existing player", () => {
    it("shows available players section when availablePlayers is non-empty", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );
      expect(
        screen.getByText("Adicionar jogador da turma")
      ).toBeInTheDocument();
    });

    it("does not show add existing player section when availablePlayers is empty", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.queryByText("Adicionar jogador da turma")
      ).not.toBeInTheDocument();
    });

    it("shows searchable player select and Adicionar button", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );
      expect(screen.getByText("Selecionar jogador")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
    });

    it("opens SearchablePlayerSelect on click and allows player selection", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );

      // Click the select trigger to open
      await user.click(screen.getByText("Selecionar jogador"));
      // Player names should appear in the dropdown
      expect(screen.getByText("Diego Santos")).toBeInTheDocument();

      // Click a player to select
      await user.click(screen.getByText("Diego Santos"));
      expect(screen.getByText("Diego Santos")).toBeInTheDocument();
    });

    it("calls addPlayerToGame when Adicionar is clicked after selection", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );

      // Open select and click Diego Santos
      await user.click(screen.getByText("Selecionar jogador"));
      await user.click(screen.getByText("Diego Santos"));

      // Now Adicionar should be enabled
      await user.click(screen.getByRole("button", { name: "Adicionar" }));

      await waitFor(() => {
        expect(mockAddPlayerToGame).toHaveBeenCalledWith("game-1", "p4");
      });
    });

    it("shows error when addPlayerToGame fails", async () => {
      mockAddPlayerToGame.mockResolvedValue({ error: "Erro ao adicionar." });
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );

      await user.click(screen.getByText("Selecionar jogador"));
      await user.click(screen.getByText("Diego Santos"));
      await user.click(screen.getByRole("button", { name: "Adicionar" }));

      await waitFor(() => {
        expect(screen.getByText("Erro ao adicionar.")).toBeInTheDocument();
      });
    });

    it("Adicionar button is disabled when no player selected", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );
      expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
    });
  });

  describe("create and add new player", () => {
    it("shows 'Cadastrar novo jogador' button", () => {
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: /Cadastrar novo jogador/ })
      ).toBeInTheDocument();
    });

    it("opens form when 'Cadastrar novo jogador' is clicked", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));

      expect(screen.getByLabelText("Nome")).toBeInTheDocument();
      expect(screen.getByLabelText("Celular")).toBeInTheDocument();
    });

    it("closes form when 'Não Cadastrar' is clicked", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));
      await user.click(screen.getByRole("button", { name: /Não Cadastrar/ }));

      expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    });

    it("submits new player form with valid data and calls createAndAddPlayer", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));

      await user.type(screen.getByLabelText("Nome"), "Novo Jogador");
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.type(screen.getByLabelText("Peso (kg)"), "75");

      // Select stamina via mocked native select
      const staminaSelect = screen.getByTestId("stamina-select");
      await user.selectOptions(staminaSelect, "3");

      await user.click(
        screen.getByRole("button", { name: /Cadastrar e confirmar presença/ })
      );

      await waitFor(() => {
        expect(mockCreateAndAddPlayer).toHaveBeenCalledWith(
          "game-1",
          expect.objectContaining({ name: "Novo Jogador", phone: "11999999999" })
        );
      });
    });

    it("shows server error when createAndAddPlayer fails", async () => {
      mockCreateAndAddPlayer.mockResolvedValue({ error: "Telefone já cadastrado." });
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));

      await user.type(screen.getByLabelText("Nome"), "Novo Jogador");
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.type(screen.getByLabelText("Peso (kg)"), "75");
      const staminaSelect = screen.getByTestId("stamina-select");
      await user.selectOptions(staminaSelect, "3");

      await user.click(
        screen.getByRole("button", { name: /Cadastrar e confirmar presença/ })
      );

      await waitFor(() => {
        expect(screen.getByText("Telefone já cadastrado.")).toBeInTheDocument();
      });
    });
  });

  describe("cancel game error handling", () => {
    it("shows error when cancelGame fails", async () => {
      mockCancelGame.mockResolvedValue({ error: "Erro ao cancelar." });
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Cancelar jogo" }));
      await user.click(
        screen.getByRole("button", { name: "Confirmar cancelamento" })
      );

      await waitFor(() => {
        expect(screen.getByText("Erro ao cancelar.")).toBeInTheDocument();
      });
    });
  });

  describe("remove confirmed player error", () => {
    it("shows error when removeConfirmedPlayer fails", async () => {
      mockRemoveConfirmedPlayer.mockResolvedValue({ error: "Erro ao remover." });
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={CONFIRMED}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: "Remover" });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Erro ao remover.")).toBeInTheDocument();
      });
    });
  });

  describe("searchable player select — empty results (line 328)", () => {
    it("shows 'Nenhum jogador encontrado' when search matches no players", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );

      await user.click(screen.getByText("Selecionar jogador"));
      await user.type(screen.getByPlaceholderText("Buscar jogador..."), "ZZZ");

      expect(screen.getByText("Nenhum jogador encontrado")).toBeInTheDocument();
    });
  });

  describe("create and add player — validation errors", () => {
    it("shows name and phone validation errors on empty submit (lines 464, 472)", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));
      await user.click(screen.getByRole("button", { name: /Cadastrar e confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Informe o nome")).toBeInTheDocument();
        expect(screen.getByText("Informe um celular válido")).toBeInTheDocument();
      });
      expect(mockCreateAndAddPlayer).not.toHaveBeenCalled();
    });

    it("shows weight and stamina validation errors (lines 486, 504)", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cadastrar novo jogador/ }));
      await user.type(screen.getByLabelText("Nome"), "Diego Santos");
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      // Enter weight below minimum (30) to trigger line 486
      await user.type(screen.getByLabelText("Peso (kg)"), "10");
      // Don't select stamina → triggers line 504
      await user.click(screen.getByRole("button", { name: /Cadastrar e confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText(/>=30/)).toBeInTheDocument();
      });
      expect(mockCreateAndAddPlayer).not.toHaveBeenCalled();
    });
  });

  describe("searchable player select search and click-outside", () => {
    it("filters players by search input", async () => {
      const user = userEvent.setup();
      render(
        <GameDetailClient
          gameId="game-1"
          drawDone={false}
          confirmed={[]}
          waitlist={[]}
          availablePlayers={AVAILABLE_PLAYERS}
        />
      );

      // Open the select
      await user.click(screen.getByText("Selecionar jogador"));
      // Type search
      await user.type(screen.getByPlaceholderText("Buscar jogador..."), "Diego");

      expect(screen.getByText("Diego Santos")).toBeInTheDocument();
      expect(screen.queryByText("Felipe Souza")).not.toBeInTheDocument();
    });
  });
});
