import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewPlayerForm } from "../new-player-form";
import { mockPush } from "@/test/mocks/next";

const mockCreatePlayer = vi.fn();

vi.mock("@/actions/players-admin", () => ({
  createPlayer: (...args: unknown[]) => mockCreatePlayer(...args),
  updatePlayer: vi.fn(),
  banPlayer: vi.fn(),
  unbanPlayer: vi.fn(),
  suspendPlayer: vi.fn(),
  removeSuspension: vi.fn(),
  listPlayers: vi.fn(),
  addRetroactiveStat: vi.fn(),
}));

// Radix UI Select doesn't work in happy-dom — replace with a native <select>
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

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome"), "Carlos Ramos");
  await user.type(screen.getByLabelText("Celular"), "11988887777");
  await user.clear(screen.getByLabelText("Peso médio (kg)"));
  await user.type(screen.getByLabelText("Peso médio (kg)"), "80");
  await user.selectOptions(screen.getByTestId("stamina-select"), "3");
}

describe("NewPlayerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePlayer.mockResolvedValue({});
  });

  describe("rendering", () => {
    it("renders name, phone, weight fields", () => {
      render(<NewPlayerForm />);
      expect(screen.getByLabelText("Nome")).toBeInTheDocument();
      expect(screen.getByLabelText("Celular")).toBeInTheDocument();
      expect(screen.getByLabelText("Peso médio (kg)")).toBeInTheDocument();
    });

    it("renders stamina select with options", () => {
      render(<NewPlayerForm />);
      expect(screen.getByTestId("stamina-select")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "1 jogo" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "4 ou mais jogos" })).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<NewPlayerForm />);
      expect(screen.getByRole("button", { name: "Cadastrar jogador" })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when name is too short", async () => {
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await user.type(screen.getByLabelText("Nome"), "A");
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(screen.getByText("Informe o nome")).toBeInTheDocument();
      });
      expect(mockCreatePlayer).not.toHaveBeenCalled();
    });

    it("shows error when phone is too short", async () => {
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await user.type(screen.getByLabelText("Celular"), "12345");
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(screen.getByText("Informe um celular válido")).toBeInTheDocument();
      });
    });

    it("does not call createPlayer when form is invalid", async () => {
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(screen.getByText("Informe o nome")).toBeInTheDocument();
      });
      expect(mockCreatePlayer).not.toHaveBeenCalled();
    });
  });

  describe("submission", () => {
    it("calls createPlayer with correct data on valid submit", async () => {
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(mockCreatePlayer).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Carlos Ramos",
            phone: "11988887777",
            weight_kg: 80,
            stamina: "3",
          })
        );
      });
    });

    it("redirects to /dashboard/jogadores on success", async () => {
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard/jogadores");
      });
    });

    it("shows server error on duplicate phone", async () => {
      mockCreatePlayer.mockResolvedValue({
        error: "Já existe um jogador com este telefone nesta turma.",
      });
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      await waitFor(() => {
        expect(
          screen.getByText("Já existe um jogador com este telefone nesta turma.")
        ).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows 'Salvando...' loading state during submission", async () => {
      mockCreatePlayer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 200))
      );
      const user = userEvent.setup();
      render(<NewPlayerForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Cadastrar jogador" }));

      expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cadastrar jogador" })
        ).toBeInTheDocument();
      });
    });
  });
});
