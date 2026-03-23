import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayersListClient } from '../players-list-client';

const PLAYERS = [
  {
    id: '1',
    name: 'Carlos Ramos',
    phone: '(11) 98888-7777',
    weight_kg: 78,
    stamina: '3',
    is_star: false,
    attendanceRate: 85,
  },
  {
    id: '2',
    name: 'Bruno Lima',
    phone: '(11) 97777-6666',
    weight_kg: 72,
    stamina: '2',
    is_star: true,
    attendanceRate: 60,
  },
  {
    id: '3',
    name: 'André Costa',
    phone: '(11) 96666-5555',
    weight_kg: 85,
    stamina: '4plus',
    is_star: false,
    attendanceRate: null,
  },
];

describe('PlayersListClient', () => {
  describe('empty states', () => {
    it('shows empty message when players array is empty', () => {
      render(<PlayersListClient players={[]} />);
      expect(
        screen.getByText('Nenhum jogador cadastrado ainda.'),
      ).toBeInTheDocument();
    });

    it('shows search-empty message when search has no results', async () => {
      const user = userEvent.setup();
      render(<PlayersListClient players={PLAYERS} />);

      await user.type(
        screen.getByPlaceholderText('Buscar por nome...'),
        'XYZXYZ',
      );

      expect(
        screen.getByText('Nenhum jogador encontrado.'),
      ).toBeInTheDocument();
    });
  });

  describe('player list rendering', () => {
    it('renders all player names', () => {
      render(<PlayersListClient players={PLAYERS} />);
      expect(screen.getByText('Carlos Ramos')).toBeInTheDocument();
      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
      expect(screen.getByText('André Costa')).toBeInTheDocument();
    });

    it('shows attendance as percentage when not null', () => {
      render(<PlayersListClient players={PLAYERS} />);
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it("shows '—' when attendanceRate is null", () => {
      render(<PlayersListClient players={PLAYERS} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it("shows '⭐ Destaque' badge for star players", () => {
      render(<PlayersListClient players={PLAYERS} />);
      expect(screen.getByText('⭐ Destaque')).toBeInTheDocument();
    });

    it('does not show star badge for non-star players', () => {
      const nonStarPlayers = PLAYERS.filter(p => !p.is_star);
      render(<PlayersListClient players={nonStarPlayers} />);
      expect(screen.queryByText('⭐ Destaque')).not.toBeInTheDocument();
    });

    it('each player card links to their detail page', () => {
      render(<PlayersListClient players={PLAYERS} />);
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/dashboard/jogadores/1');
      expect(links[1]).toHaveAttribute('href', '/dashboard/jogadores/2');
      expect(links[2]).toHaveAttribute('href', '/dashboard/jogadores/3');
    });
  });

  describe('search / filter', () => {
    it('filters players by name (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<PlayersListClient players={PLAYERS} />);

      await user.type(
        screen.getByPlaceholderText('Buscar por nome...'),
        'carlos',
      );

      expect(screen.getByText('Carlos Ramos')).toBeInTheDocument();
      expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
      expect(screen.queryByText('André Costa')).not.toBeInTheDocument();
    });

    it('search is case-insensitive', async () => {
      const user = userEvent.setup();
      render(<PlayersListClient players={PLAYERS} />);

      await user.type(
        screen.getByPlaceholderText('Buscar por nome...'),
        'BRUNO',
      );

      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
      expect(screen.queryByText('Carlos Ramos')).not.toBeInTheDocument();
    });

    it('shows all players when search is cleared', async () => {
      const user = userEvent.setup();
      render(<PlayersListClient players={PLAYERS} />);

      await user.type(
        screen.getByPlaceholderText('Buscar por nome...'),
        'Carlos',
      );
      await user.clear(screen.getByPlaceholderText('Buscar por nome...'));

      expect(screen.getByText('Carlos Ramos')).toBeInTheDocument();
      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    });

    it('partial name match works', async () => {
      const user = userEvent.setup();
      render(<PlayersListClient players={PLAYERS} />);

      await user.type(
        screen.getByPlaceholderText('Buscar por nome...'),
        'Lima',
      );

      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
      expect(screen.queryByText('Carlos Ramos')).not.toBeInTheDocument();
    });
  });
});
