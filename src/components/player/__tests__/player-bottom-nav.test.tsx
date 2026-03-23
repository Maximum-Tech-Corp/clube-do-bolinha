import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerBottomNav } from "../player-bottom-nav";
import { mockUsePathname } from "@/test/mocks/next";

const TEAM_CODE = "BOLA-ABC123";

describe("PlayerBottomNav", () => {
  it("renders 3 navigation links", () => {
    mockUsePathname.mockReturnValue("/");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("renders 'Início' link pointing to /", () => {
    mockUsePathname.mockReturnValue("/");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Início/ });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders 'Jogos' link pointing to team code path", () => {
    mockUsePathname.mockReturnValue("/");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Jogos/ });
    expect(link).toHaveAttribute("href", `/jogador/${TEAM_CODE}`);
  });

  it("renders 'Trocar turma' link pointing to /jogador", () => {
    mockUsePathname.mockReturnValue("/");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Trocar turma/ });
    expect(link).toHaveAttribute("href", "/jogador");
  });

  it("highlights 'Início' when pathname is /", () => {
    mockUsePathname.mockReturnValue("/");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Início/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("highlights 'Jogos' when on the team path", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Jogos/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("highlights 'Jogos' when on a sub-path of the team code", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}/lista/game-1`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Jogos/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("does not highlight 'Início' when on a different path", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Início/ });
    expect(link.className).toMatch(/text-muted-foreground/);
  });

  it("highlights 'Trocar turma' when pathname is exactly /jogador", () => {
    mockUsePathname.mockReturnValue("/jogador");
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole("link", { name: /Trocar turma/ });
    expect(link.className).toMatch(/text-primary/);
  });
});
