import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayersListClient } from '../players-list-client';

const FUTURE_DATE = new Date(Date.now() + 7 * 86400000).toISOString();
const PAST_DATE = new Date(Date.now() - 86400000).toISOString();

const PLAYERS = [
  {
    id: '1',
    name: 'Carlos Ramos',
    phone: '(11) 98888-7777',
    weight_kg: 78,
    stamina: '3',
    is_star: false,
    is_banned: false,
    suspended_until: null,
    attendanceRate: 85,
  },
  {
    id: '2',
    name: 'Bruno Lima',
    phone: '(11) 97777-6666',
    weight_kg: 72,
    stamina: '2',
    is_star: true,
    is_banned: false,
    suspended_until: null,
    attendanceRate: 60,
  },
  {
    id: '3',
    name: 'André Costa',
    phone: '(11) 96666-5555',
    weight_kg: 85,
    stamina: '4plus',
    is_star: false,
    is_banned: false,
    suspended_until: null,
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

  describe('banned player', () => {
    const BANNED_PLAYER = {
      ...PLAYERS[0],
      id: 'banned-1',
      name: 'João Banido',
      is_banned: true,
    };

    it('shows "— Banido" next to the player name', () => {
      render(<PlayersListClient players={[BANNED_PLAYER]} />);
      expect(screen.getByText(/— Banido/)).toBeInTheDocument();
    });

    it('applies red background to the card', () => {
      render(<PlayersListClient players={[BANNED_PLAYER]} />);
      const card = screen
        .getByText(/— Banido/)
        .closest('[data-slot="card"]');
      expect(card?.className).toContain('bg-red-50');
    });

    it('applies red ring to the card', () => {
      render(<PlayersListClient players={[BANNED_PLAYER]} />);
      const card = screen
        .getByText(/— Banido/)
        .closest('[data-slot="card"]');
      expect(card?.className).toContain('ring-red-300');
    });

    it('does not show "— Banido" for a normal player', () => {
      render(<PlayersListClient players={[PLAYERS[0]]} />);
      expect(screen.queryByText(/— Banido/)).not.toBeInTheDocument();
    });
  });

  describe('suspended player', () => {
    const SUSPENDED_PLAYER = {
      ...PLAYERS[0],
      id: 'suspended-1',
      name: 'Pedro Suspenso',
      suspended_until: FUTURE_DATE,
    };

    const EXPIRED_SUSPENSION_PLAYER = {
      ...PLAYERS[0],
      id: 'expired-1',
      name: 'Lucas Expirado',
      suspended_until: PAST_DATE,
    };

    const BANNED_AND_SUSPENDED_PLAYER = {
      ...PLAYERS[0],
      id: 'banned-suspended-1',
      name: 'Marcos BanidoSuspenso',
      is_banned: true,
      suspended_until: FUTURE_DATE,
    };

    it('shows "— Suspenso" next to the player name when suspension is active', () => {
      render(<PlayersListClient players={[SUSPENDED_PLAYER]} />);
      expect(screen.getByText(/— Suspenso/)).toBeInTheDocument();
    });

    it('applies yellow background to the card', () => {
      render(<PlayersListClient players={[SUSPENDED_PLAYER]} />);
      const card = screen
        .getByText(/— Suspenso/)
        .closest('[data-slot="card"]');
      expect(card?.className).toContain('bg-yellow-50');
    });

    it('applies yellow ring to the card', () => {
      render(<PlayersListClient players={[SUSPENDED_PLAYER]} />);
      const card = screen
        .getByText(/— Suspenso/)
        .closest('[data-slot="card"]');
      expect(card?.className).toContain('ring-yellow-300');
    });

    it('does not show "— Suspenso" when suspension has expired', () => {
      render(<PlayersListClient players={[EXPIRED_SUSPENSION_PLAYER]} />);
      expect(screen.queryByText(/— Suspenso/)).not.toBeInTheDocument();
    });

    it('does not apply yellow styles when suspension has expired', () => {
      render(<PlayersListClient players={[EXPIRED_SUSPENSION_PLAYER]} />);
      const cards = document.querySelectorAll('[data-slot="card"]');
      cards.forEach(card => {
        expect(card.className).not.toContain('bg-yellow-50');
      });
    });

    it('shows "— Banido" (not "— Suspenso") when player is both banned and suspended', () => {
      render(<PlayersListClient players={[BANNED_AND_SUSPENDED_PLAYER]} />);
      expect(screen.getByText(/— Banido/)).toBeInTheDocument();
      expect(screen.queryByText(/— Suspenso/)).not.toBeInTheDocument();
    });

    it('applies red (not yellow) styles when player is both banned and suspended', () => {
      render(<PlayersListClient players={[BANNED_AND_SUSPENDED_PLAYER]} />);
      const card = document.querySelector('[data-slot="card"]');
      expect(card?.className).toContain('bg-red-50');
      expect(card?.className).not.toContain('bg-yellow-50');
    });
  });
});
