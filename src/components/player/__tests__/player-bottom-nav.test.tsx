import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerBottomNav } from '../player-bottom-nav';
import { mockUsePathname, mockPush } from '@/test/mocks/next';

const TEAM_CODE = 'BOLA-ABC123';

const mockClearLastTeamCode = vi.fn();
vi.mock('@/actions/player', () => ({
  clearLastTeamCode: () => mockClearLastTeamCode(),
}));

describe('PlayerBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 2 navigation links (Início and Jogos)', () => {
    mockUsePathname.mockReturnValue('/');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it("renders 'Início' link pointing to /", () => {
    mockUsePathname.mockReturnValue('/');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Início/ });
    expect(link).toHaveAttribute('href', '/');
  });

  it("renders 'Jogos' link pointing to team code path", () => {
    mockUsePathname.mockReturnValue('/');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Jogos/ });
    expect(link).toHaveAttribute('href', `/jogador/${TEAM_CODE}`);
  });

  it("renders 'Trocar turma' as a button (not a link)", () => {
    mockUsePathname.mockReturnValue('/');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    expect(screen.getByRole('button', { name: /Trocar turma/ })).toBeTruthy();
  });

  it("clicking 'Trocar turma' calls clearLastTeamCode and navigates to /jogador", async () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    fireEvent.click(screen.getByRole('button', { name: /Trocar turma/ }));
    await vi.waitFor(() => {
      expect(mockClearLastTeamCode).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/jogador');
    });
  });

  it("highlights 'Início' when pathname is /", () => {
    mockUsePathname.mockReturnValue('/');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Início/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("highlights 'Jogos' when on the team path", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Jogos/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("highlights 'Jogos' when on a sub-path of the team code", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}/lista/game-1`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Jogos/ });
    expect(link.className).toMatch(/text-primary/);
  });

  it("does not highlight 'Início' when on a different path", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const link = screen.getByRole('link', { name: /Início/ });
    expect(link.className).toMatch(/text-muted-foreground/);
  });

  it("highlights 'Trocar turma' button when pathname is exactly /jogador", () => {
    mockUsePathname.mockReturnValue('/jogador');
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const button = screen.getByRole('button', { name: /Trocar turma/ });
    expect(button.className).toMatch(/text-primary/);
  });

  it("does not highlight 'Trocar turma' button when on a different path", () => {
    mockUsePathname.mockReturnValue(`/jogador/${TEAM_CODE}`);
    render(<PlayerBottomNav teamCode={TEAM_CODE} />);
    const button = screen.getByRole('button', { name: /Trocar turma/ });
    expect(button.className).toMatch(/text-muted-foreground/);
  });
});
