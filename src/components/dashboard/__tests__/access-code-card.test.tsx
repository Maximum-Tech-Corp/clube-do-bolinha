import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessCodeCard } from "../access-code-card";

const mockUpdateAccessCodePrefix = vi.fn();

vi.mock("@/actions/team", () => ({
  updateAccessCodePrefix: (...args: unknown[]) =>
    mockUpdateAccessCodePrefix(...args),
  updateTeamSettings: vi.fn(),
}));

const DEFAULT_PROPS = {
  teamName: "Bolinha FC",
  accessCode: "ABCD-XYZ123",
  appUrl: "https://clube.app",
};

describe("AccessCodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateAccessCodePrefix.mockResolvedValue({});
  });

  describe("rendering", () => {
    it("shows the full access code", () => {
      render(<AccessCodeCard {...DEFAULT_PROPS} />);
      expect(screen.getByText("ABCD-XYZ123")).toBeInTheDocument();
    });

    it("shows 'Editar prefixo' button", () => {
      render(<AccessCodeCard {...DEFAULT_PROPS} />);
      expect(
        screen.getByRole("button", { name: "Editar prefixo" })
      ).toBeInTheDocument();
    });

    it("shows WhatsApp share link", () => {
      render(<AccessCodeCard {...DEFAULT_PROPS} />);
      const link = screen.getByRole("link", { name: /compartilhar no whatsapp/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toContain("wa.me");
    });

    it("WhatsApp link contains the access code", () => {
      render(<AccessCodeCard {...DEFAULT_PROPS} />);
      const link = screen.getByRole("link", { name: /compartilhar no whatsapp/i });
      expect(link.getAttribute("href")).toContain("ABCD-XYZ123");
    });

    it("WhatsApp link contains the team name", () => {
      render(<AccessCodeCard {...DEFAULT_PROPS} />);
      const link = screen.getByRole("link", { name: /compartilhar no whatsapp/i });
      expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
        "Bolinha FC"
      );
    });
  });

  describe("copy to clipboard", () => {
    it("shows 'Copiado!' flash after clicking the code (confirms clipboard was invoked)", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByTitle("Clique para copiar"));

      // The component sets copied=true in the .then() callback after writeText resolves.
      // The native happy-dom clipboard resolves synchronously so "Copiado!" appears.
      await waitFor(() => {
        expect(screen.getByText("Copiado!")).toBeInTheDocument();
      });
    });
  });

  describe("edit prefix mode", () => {
    it("enters edit mode when 'Editar prefixo' is clicked", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    });

    it("shows prefix input pre-filled with current prefix", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("ABCD");
    });

    it("shows the suffix (non-editable) alongside the prefix input", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      expect(screen.getByText("XYZ123")).toBeInTheDocument();
    });

    it("input converts to uppercase", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "abcd");

      expect((input as HTMLInputElement).value).toBe("ABCD");
    });

    it("input strips non-alphanumeric characters", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "AB!@");

      // Only alphanumeric chars survive
      const val = (input as HTMLInputElement).value;
      expect(val).toMatch(/^[A-Z0-9]*$/);
    });

    it("'Salvar' is disabled when prefix is less than 4 chars", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "AB");

      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    });

    it("calls updateAccessCodePrefix on save with the new prefix", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "NEWP");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(mockUpdateAccessCodePrefix).toHaveBeenCalledWith("NEWP");
      });
    });

    it("shows updated code after successful save", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "NEWP");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(screen.getByText("NEWP-XYZ123")).toBeInTheDocument();
      });
    });

    it("shows error when save fails", async () => {
      mockUpdateAccessCodePrefix.mockResolvedValue({
        error: "Este código já está em uso. Tente outro prefixo.",
      });
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(
          screen.getByText("Este código já está em uso. Tente outro prefixo.")
        ).toBeInTheDocument();
      });
    });

    it("cancel restores original prefix and exits edit mode", async () => {
      const user = userEvent.setup();
      render(<AccessCodeCard {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole("button", { name: "Editar prefixo" }));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "XXXX");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      // Should show original code, not the edited one
      expect(screen.getByText("ABCD-XYZ123")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Editar prefixo" })
      ).toBeInTheDocument();
    });
  });
});
