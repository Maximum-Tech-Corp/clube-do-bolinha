import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmPresenceDialog } from "../confirm-presence-dialog";

const mockConfirmPresence = vi.fn();

vi.mock("@/actions/player", () => ({
  confirmPresence: (...args: unknown[]) => mockConfirmPresence(...args),
}));

// Radix Select não é interagível no happy-dom — substitui por <select> nativo
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

const BASE_PROPS = {
  gameId: "game-1",
  teamId: "team-1",
  open: true,
  onOpenChange: vi.fn(),
};

describe("ConfirmPresenceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render content when closed", () => {
    render(<ConfirmPresenceDialog {...BASE_PROPS} open={false} />);
    expect(screen.queryByText("Confirmar presença")).not.toBeInTheDocument();
  });

  describe("Step: phone", () => {
    it("renders phone input on open", () => {
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);
      expect(screen.getByLabelText("Celular")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    });

    it("shows validation error for short phone", async () => {
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "123");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText(/celular válido/i)).toBeInTheDocument();
      });
      expect(mockConfirmPresence).not.toHaveBeenCalled();
    });

    it("pre-fills phone when defaultPhone provided", () => {
      render(<ConfirmPresenceDialog {...BASE_PROPS} defaultPhone="11999999999" />);
      const input = screen.getByLabelText("Celular") as HTMLInputElement;
      expect(input.value).toBe("11999999999");
    });

    it("shows server error returned by action", async () => {
      mockConfirmPresence.mockResolvedValue({ error: "Erro interno" });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Erro interno")).toBeInTheDocument();
      });
    });

    it("shows banned message when player is banned", async () => {
      mockConfirmPresence.mockResolvedValue({ banned: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Acesso bloqueado")).toBeInTheDocument();
      });
    });

    it("shows suspended message with date when player is suspended", async () => {
      mockConfirmPresence.mockResolvedValue({
        suspended: true,
        until: "2026-05-01T00:00:00.000Z",
        reason: "Comportamento inadequado",
      });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Jogador suspenso")).toBeInTheDocument();
        expect(screen.getByText(/Comportamento inadequado/)).toBeInTheDocument();
      });
    });

    it("transitions to register step when player needs registration", async () => {
      mockConfirmPresence.mockResolvedValue({ needsRegistration: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Primeiro acesso")).toBeInTheDocument();
        expect(screen.getByLabelText("Nome")).toBeInTheDocument();
      });
    });

    it("shows waitlist offer when game is full", async () => {
      mockConfirmPresence.mockResolvedValue({ gameFull: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Jogo lotado")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Entrar na lista de espera/ })
        ).toBeInTheDocument();
      });
    });

    it("shows already confirmed message", async () => {
      mockConfirmPresence.mockResolvedValue({ alreadyConfirmed: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Você já confirmou!")).toBeInTheDocument();
      });
    });

    it("shows 'Presença confirmada!' on success", async () => {
      mockConfirmPresence.mockResolvedValue({ status: "confirmed" });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Presença confirmada!")).toBeInTheDocument();
      });
    });

    it("shows 'Na lista de espera' when status is waitlist", async () => {
      mockConfirmPresence.mockResolvedValue({ status: "waitlist" });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
      });
    });
  });

  describe("Step: register", () => {
    // Abre o step de registro e preenche todos os campos válidos
    async function openRegisterStep() {
      mockConfirmPresence.mockResolvedValueOnce({ needsRegistration: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Primeiro acesso")).toBeInTheDocument();
      });

      return user;
    }

    async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText("Nome"), "João Silva");
      await user.clear(screen.getByLabelText(/Peso/));
      await user.type(screen.getByLabelText(/Peso/), "80");
      await user.selectOptions(screen.getByTestId("stamina-select"), "3");
    }

    it("renders name, weight, and stamina fields", async () => {
      await openRegisterStep();
      expect(screen.getByLabelText("Nome")).toBeInTheDocument();
      expect(screen.getByLabelText(/Peso/)).toBeInTheDocument();
      expect(screen.getByTestId("stamina-select")).toBeInTheDocument();
    });

    it("shows name validation error on short name", async () => {
      const user = await openRegisterStep();
      await user.type(screen.getByLabelText("Nome"), "A");
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Informe seu nome")).toBeInTheDocument();
      });
    });

    it("sets stamina via select (line 257)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ status: "confirmed" });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(mockConfirmPresence).toHaveBeenCalledWith(
          expect.objectContaining({
            newPlayer: expect.objectContaining({ stamina: "3" }),
          })
        );
      });
    });

    it("shows server error when onRegisterSubmit returns error (line 125 + 278)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ error: "Telefone já cadastrado." });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Telefone já cadastrado.")).toBeInTheDocument();
      });
    });

    it("transitions to banned step when register returns banned (line 126)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ banned: true });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Acesso bloqueado")).toBeInTheDocument();
      });
    });

    it("transitions to suspended step when register returns suspended (lines 127-130)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({
        suspended: true,
        until: "2026-06-01T00:00:00.000Z",
        reason: "Falta grave",
      });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Jogador suspenso")).toBeInTheDocument();
        expect(screen.getByText(/Falta grave/)).toBeInTheDocument();
      });
    });

    it("shows waitlist offer when register returns gameFull (line 132)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ gameFull: true });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Jogo lotado")).toBeInTheDocument();
      });
    });

    it("shows already confirmed when register returns alreadyConfirmed (line 133)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ alreadyConfirmed: true });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Você já confirmou!")).toBeInTheDocument();
      });
    });

    it("shows confirmed step on success (line 134)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ status: "confirmed" });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Presença confirmada!")).toBeInTheDocument();
      });
    });

    it("shows waitlisted step when register returns waitlist status (line 134)", async () => {
      const user = await openRegisterStep();
      mockConfirmPresence.mockResolvedValue({ status: "waitlist" });

      await fillRegisterForm(user);
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => {
        expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
      });
    });
  });

  describe("Step: waitlist_offer (via phone)", () => {
    // Chega ao waitlist_offer direto do step de phone (sem pendingNewPlayer)
    async function openWaitlistOfferStep() {
      mockConfirmPresence.mockResolvedValueOnce({ gameFull: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Jogo lotado")).toBeInTheDocument();
      });

      return user;
    }

    it("transitions to waitlisted step after joining waitlist", async () => {
      const user = await openWaitlistOfferStep();
      mockConfirmPresence.mockResolvedValue({ status: "waitlist" });

      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));

      await waitFor(() => {
        expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
      });
    });

    it("shows server error when joining waitlist fails", async () => {
      const user = await openWaitlistOfferStep();
      mockConfirmPresence.mockResolvedValue({ error: "Erro ao entrar na fila." });

      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));

      await waitFor(() => {
        expect(screen.getByText("Erro ao entrar na fila.")).toBeInTheDocument();
      });
    });
  });

  describe("Step: waitlist_offer (via register — com pendingNewPlayer)", () => {
    // Chega ao waitlist_offer após preencher o formulário de registro.
    // Neste caso pendingNewPlayer está preenchido, cobrindo as linhas 144-148.
    async function openWaitlistViaRegister() {
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);

      // Phone step → needsRegistration
      mockConfirmPresence.mockResolvedValueOnce({ needsRegistration: true });
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Primeiro acesso")).toBeInTheDocument());

      // Register step → gameFull (define pendingNewPlayer)
      mockConfirmPresence.mockResolvedValueOnce({ gameFull: true });
      await user.type(screen.getByLabelText("Nome"), "João Silva");
      await user.clear(screen.getByLabelText(/Peso/));
      await user.type(screen.getByLabelText(/Peso/), "80");
      await user.selectOptions(screen.getByTestId("stamina-select"), "3");
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));
      await waitFor(() => expect(screen.getByText("Jogo lotado")).toBeInTheDocument());

      return user;
    }

    it("envia pendingNewPlayer ao confirmar fila de espera (lines 144-148)", async () => {
      const user = await openWaitlistViaRegister();
      mockConfirmPresence.mockResolvedValue({ status: "waitlist" });

      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));

      await waitFor(() => {
        expect(mockConfirmPresence).toHaveBeenLastCalledWith(
          expect.objectContaining({
            joinWaitlist: true,
            newPlayer: expect.objectContaining({ name: "João Silva" }),
          })
        );
        expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
      });
    });

    it("mostra suspended quando onJoinWaitlist retorna suspended (lines 156-158)", async () => {
      const user = await openWaitlistViaRegister();
      mockConfirmPresence.mockResolvedValue({
        suspended: true,
        until: "2026-07-01T00:00:00.000Z",
        reason: null,
      });

      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));

      await waitFor(() => {
        expect(screen.getByText("Jogador suspenso")).toBeInTheDocument();
      });
    });
  });

  describe("close buttons in terminal steps", () => {
    it("closes from waitlisted step", async () => {
      mockConfirmPresence.mockResolvedValue({ status: "waitlist" });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Na lista de espera")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Fechar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes from already_confirmed step", async () => {
      mockConfirmPresence.mockResolvedValue({ alreadyConfirmed: true });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Você já confirmou!")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Fechar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes from banned step", async () => {
      mockConfirmPresence.mockResolvedValue({ banned: true });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Acesso bloqueado")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Fechar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes from suspended step", async () => {
      mockConfirmPresence.mockResolvedValue({ suspended: true, until: "2026-05-01T00:00:00Z", reason: null });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Jogador suspenso")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Fechar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes via Cancelar button in waitlist_offer step", async () => {
      mockConfirmPresence.mockResolvedValue({ gameFull: true });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Jogo lotado")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("onJoinWaitlist branch coverage", () => {
    async function openWaitlistOffer() {
      mockConfirmPresence.mockResolvedValueOnce({ gameFull: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Jogo lotado")).toBeInTheDocument());
      return user;
    }

    it("transitions to banned when onJoinWaitlist returns banned (line 154)", async () => {
      const user = await openWaitlistOffer();
      mockConfirmPresence.mockResolvedValue({ banned: true });
      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));
      await waitFor(() => expect(screen.getByText("Acesso bloqueado")).toBeInTheDocument());
    });

    it("stays when onJoinWaitlist returns needsRegistration (line 159)", async () => {
      const user = await openWaitlistOffer();
      mockConfirmPresence.mockResolvedValue({ needsRegistration: true });
      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));
      await waitFor(() => expect(mockConfirmPresence).toHaveBeenCalledTimes(2));
      expect(screen.getByText("Jogo lotado")).toBeInTheDocument();
    });

    it("stays when onJoinWaitlist returns gameFull (line 160)", async () => {
      const user = await openWaitlistOffer();
      mockConfirmPresence.mockResolvedValue({ gameFull: true });
      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));
      await waitFor(() => expect(mockConfirmPresence).toHaveBeenCalledTimes(2));
      expect(screen.getByText("Jogo lotado")).toBeInTheDocument();
    });

    it("transitions to already_confirmed when onJoinWaitlist returns alreadyConfirmed (line 161)", async () => {
      const user = await openWaitlistOffer();
      mockConfirmPresence.mockResolvedValue({ alreadyConfirmed: true });
      await user.click(screen.getByRole("button", { name: /Entrar na lista de espera/ }));
      await waitFor(() => expect(screen.getByText("Você já confirmou!")).toBeInTheDocument());
    });
  });

  describe("onRegisterSubmit branch coverage", () => {
    it("stays on register step when needsRegistration returned (line 131)", async () => {
      mockConfirmPresence.mockResolvedValueOnce({ needsRegistration: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);
      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("Primeiro acesso")).toBeInTheDocument());

      mockConfirmPresence.mockResolvedValue({ needsRegistration: true });
      await user.type(screen.getByLabelText("Nome"), "João");
      await user.clear(screen.getByLabelText(/Peso/));
      await user.type(screen.getByLabelText(/Peso/), "80");
      await user.selectOptions(screen.getByTestId("stamina-select"), "3");
      await user.click(screen.getByRole("button", { name: /Confirmar presença/ }));

      await waitFor(() => expect(mockConfirmPresence).toHaveBeenCalledTimes(2));
      expect(screen.getByText("Primeiro acesso")).toBeInTheDocument();
    });
  });

  describe("handleClose reset", () => {
    it("resets to phone step when dialog is closed", async () => {
      mockConfirmPresence.mockResolvedValueOnce({ status: "confirmed" });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />);

      await user.type(screen.getByLabelText("Celular"), "11999999999");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => {
        expect(screen.getByText("Presença confirmada!")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Fechar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
