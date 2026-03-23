import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNav } from '../bottom-nav';
import { mockUsePathname } from '@/test/mocks/next';

describe('BottomNav (dashboard)', () => {
  describe('rendering', () => {
    it('renders all 5 nav links', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<BottomNav />);

      expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /jogos/i })).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /jogadores/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /histórico/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /rankings/i }),
      ).toBeInTheDocument();
    });

    it('renders correct hrefs', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<BottomNav />);

      expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute(
        'href',
        '/dashboard',
      );
      expect(screen.getByRole('link', { name: /jogos/i })).toHaveAttribute(
        'href',
        '/dashboard/jogos',
      );
      expect(screen.getByRole('link', { name: /jogadores/i })).toHaveAttribute(
        'href',
        '/dashboard/jogadores',
      );
      expect(screen.getByRole('link', { name: /histórico/i })).toHaveAttribute(
        'href',
        '/dashboard/historico',
      );
      expect(screen.getByRole('link', { name: /rankings/i })).toHaveAttribute(
        'href',
        '/dashboard/rankings',
      );
    });
  });

  describe('active highlighting', () => {
    it('highlights Início only on exact /dashboard match', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<BottomNav />);

      const inicio = screen.getByRole('link', { name: /início/i });
      expect(inicio.className).toContain('text-primary');
    });

    it('does not highlight Início on sub-route /dashboard/jogos', () => {
      mockUsePathname.mockReturnValue('/dashboard/jogos');
      render(<BottomNav />);

      const inicio = screen.getByRole('link', { name: /início/i });
      expect(inicio.className).not.toContain('text-primary');
    });

    it('highlights Jogos on /dashboard/jogos', () => {
      mockUsePathname.mockReturnValue('/dashboard/jogos');
      render(<BottomNav />);

      const jogos = screen.getByRole('link', { name: /jogos/i });
      expect(jogos.className).toContain('text-primary');
    });

    it('highlights Jogos on a sub-route like /dashboard/jogos/123', () => {
      mockUsePathname.mockReturnValue('/dashboard/jogos/abc-123/times');
      render(<BottomNav />);

      const jogos = screen.getByRole('link', { name: /jogos/i });
      expect(jogos.className).toContain('text-primary');
    });

    it('highlights Jogadores on /dashboard/jogadores/123', () => {
      mockUsePathname.mockReturnValue('/dashboard/jogadores/player-id');
      render(<BottomNav />);

      const jogadores = screen.getByRole('link', { name: /jogadores/i });
      expect(jogadores.className).toContain('text-primary');
    });
  });
});
