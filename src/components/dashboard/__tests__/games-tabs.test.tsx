import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GamesTabs, type Game } from '../games-tabs';
import '@/test/mocks/next';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: '1',
    location: 'Quadra Municipal',
    scheduled_at: '2026-04-10T19:00:00.000Z',
    status: 'open',
    draw_done: false,
    is_tournament: false,
    ...overrides,
  };
}

describe('GamesTabs', () => {
  describe('rendering', () => {
    it('renders both tab triggers', () => {
      render(<GamesTabs upcoming={[]} past={[]} />);
      expect(
        screen.getByRole('tab', { name: /próximos jogos/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /jogos recentes/i }),
      ).toBeInTheDocument();
    });

    it('"Próximos jogos" tab is active by default', () => {
      render(<GamesTabs upcoming={[]} past={[]} />);
      const tab = screen.getByRole('tab', { name: /próximos jogos/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows empty state when upcoming list is empty', () => {
      render(<GamesTabs upcoming={[]} past={[]} />);
      expect(screen.getByText('Nenhum jogo agendado.')).toBeInTheDocument();
    });
  });

  describe('badge counter', () => {
    it('shows badge with count when there are upcoming games', () => {
      const upcoming = [makeGame({ id: '1' }), makeGame({ id: '2' })];
      render(<GamesTabs upcoming={upcoming} past={[]} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show badge when there are no upcoming games', () => {
      render(<GamesTabs upcoming={[]} past={[]} />);
      // Badge would contain a number — none should be present in the tab list
      const tabList = screen.getByRole('tablist');
      expect(tabList).not.toHaveTextContent(/^\d+$/);
    });
  });

  describe('upcoming tab content', () => {
    it('renders game rows for upcoming games', () => {
      const upcoming = [
        makeGame({ id: '1', location: 'Arena Norte' }),
        makeGame({ id: '2', location: 'Ginásio Sul' }),
      ];
      render(<GamesTabs upcoming={upcoming} past={[]} />);
      expect(screen.getByText('Arena Norte')).toBeInTheDocument();
      expect(screen.getByText('Ginásio Sul')).toBeInTheDocument();
    });

    it('shows "Local não definido" when location is null', () => {
      render(<GamesTabs upcoming={[makeGame({ location: null })]} past={[]} />);
      expect(screen.getByText('Local não definido')).toBeInTheDocument();
    });

    it('shows "Campeonato" label for tournament games', () => {
      render(
        <GamesTabs upcoming={[makeGame({ is_tournament: true })]} past={[]} />,
      );
      expect(screen.getByText(/campeonato/i)).toBeInTheDocument();
    });

    it('shows "Sorteio feito" badge when draw is done', () => {
      render(
        <GamesTabs upcoming={[makeGame({ draw_done: true })]} past={[]} />,
      );
      expect(screen.getByText('Sorteio feito')).toBeInTheDocument();
    });

    it('links each game to its detail page', () => {
      render(<GamesTabs upcoming={[makeGame({ id: 'abc123' })]} past={[]} />);
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/dashboard/jogos/abc123',
      );
    });
  });

  describe('past tab content', () => {
    it('shows empty state when past list is empty', async () => {
      const user = userEvent.setup();
      render(<GamesTabs upcoming={[]} past={[]} />);
      await user.click(screen.getByRole('tab', { name: /jogos recentes/i }));
      expect(screen.getByText('Nenhum jogo no histórico.')).toBeInTheDocument();
    });

    it('renders game rows for past games after switching tabs', async () => {
      const user = userEvent.setup();
      const past = [
        makeGame({ id: '9', location: 'Quadra Velha', status: 'finished' }),
      ];
      render(<GamesTabs upcoming={[]} past={past} />);
      await user.click(screen.getByRole('tab', { name: /jogos recentes/i }));
      expect(screen.getByText('Quadra Velha')).toBeInTheDocument();
    });
  });
});
