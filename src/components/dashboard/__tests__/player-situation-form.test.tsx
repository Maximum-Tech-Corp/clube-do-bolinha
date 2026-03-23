import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerSituationForm } from '../player-situation-form';

const mockBanPlayer = vi.fn();
const mockUnbanPlayer = vi.fn();
const mockSuspendPlayer = vi.fn();
const mockRemoveSuspension = vi.fn();

vi.mock('@/actions/players-admin', () => ({
  banPlayer: (...args: unknown[]) => mockBanPlayer(...args),
  unbanPlayer: (...args: unknown[]) => mockUnbanPlayer(...args),
  suspendPlayer: (...args: unknown[]) => mockSuspendPlayer(...args),
  removeSuspension: (...args: unknown[]) => mockRemoveSuspension(...args),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  listPlayers: vi.fn(),
  addRetroactiveStat: vi.fn(),
}));

// A future date for suspension tests
const FUTURE_DATE = '2099-12-31';
const PAST_DATE = '2000-01-01';

const BASE_PROPS = {
  playerId: 'player-1',
  isBanned: false,
  suspendedUntil: null,
  suspensionReason: null,
};

describe('PlayerSituationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBanPlayer.mockResolvedValue({});
    mockUnbanPlayer.mockResolvedValue({});
    mockSuspendPlayer.mockResolvedValue({});
    mockRemoveSuspension.mockResolvedValue({});
  });

  describe('status display', () => {
    it('does not show status badge when player is active', () => {
      render(<PlayerSituationForm {...BASE_PROPS} />);
      expect(screen.queryByText('Jogador banido')).not.toBeInTheDocument();
      expect(screen.queryByText(/Suspenso até/)).not.toBeInTheDocument();
    });

    it("shows 'Jogador banido' when isBanned is true", () => {
      render(<PlayerSituationForm {...BASE_PROPS} isBanned={true} />);
      expect(screen.getByText('Jogador banido')).toBeInTheDocument();
    });

    it('shows suspended status when suspendedUntil is in the future', () => {
      render(
        <PlayerSituationForm
          {...BASE_PROPS}
          suspendedUntil={`${FUTURE_DATE}T23:59:59.999Z`}
          suspensionReason="Conduta inadequada"
        />,
      );
      expect(screen.getByText(/Suspenso até/)).toBeInTheDocument();
      expect(screen.getByText('Conduta inadequada')).toBeInTheDocument();
    });

    it('does not show suspended status when suspendedUntil is in the past', () => {
      render(
        <PlayerSituationForm
          {...BASE_PROPS}
          suspendedUntil={`${PAST_DATE}T23:59:59.999Z`}
        />,
      );
      expect(screen.queryByText(/Suspenso até/)).not.toBeInTheDocument();
    });
  });

  describe('ban toggle', () => {
    it("shows 'Banir' button when player is not banned", () => {
      render(<PlayerSituationForm {...BASE_PROPS} />);
      expect(screen.getByRole('button', { name: 'Banir' })).toBeInTheDocument();
    });

    it("shows 'Remover banimento' button when player is banned", () => {
      render(<PlayerSituationForm {...BASE_PROPS} isBanned={true} />);
      expect(
        screen.getByRole('button', { name: 'Remover banimento' }),
      ).toBeInTheDocument();
    });

    it("calls banPlayer with playerId when 'Banir' is clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Banir' }));

      await waitFor(() => {
        expect(mockBanPlayer).toHaveBeenCalledWith('player-1');
      });
    });

    it("calls unbanPlayer with playerId when 'Remover banimento' is clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} isBanned={true} />);

      await user.click(
        screen.getByRole('button', { name: 'Remover banimento' }),
      );

      await waitFor(() => {
        expect(mockUnbanPlayer).toHaveBeenCalledWith('player-1');
      });
    });

    it('shows server error when banPlayer fails', async () => {
      mockBanPlayer.mockResolvedValue({ error: 'Erro ao banir jogador.' });
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Banir' }));

      await waitFor(() => {
        expect(screen.getByText('Erro ao banir jogador.')).toBeInTheDocument();
      });
    });
  });

  describe('suspension', () => {
    it("shows 'Suspender' button when player is not suspended", () => {
      render(<PlayerSituationForm {...BASE_PROPS} />);
      expect(
        screen.getByRole('button', { name: 'Suspender' }),
      ).toBeInTheDocument();
    });

    it("clicking 'Suspender' reveals the suspension form", async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      expect(screen.queryByLabelText('Suspenso até')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Suspender' }));
      expect(screen.getByLabelText('Suspenso até')).toBeInTheDocument();
    });

    it("clicking 'Cancelar' hides the suspension form", async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Suspender' }));
      expect(screen.getByLabelText('Suspenso até')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByLabelText('Suspenso até')).not.toBeInTheDocument();
    });

    it("'Confirmar suspensão' button is disabled when no date is selected", async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Suspender' }));

      expect(
        screen.getByRole('button', { name: 'Confirmar suspensão' }),
      ).toBeDisabled();
    });

    it('calls suspendPlayer with playerId, future date string, and reason', async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Suspender' }));

      fireEvent.change(screen.getByLabelText('Suspenso até'), {
        target: { value: FUTURE_DATE },
      });

      const reasonLabel = screen.getByLabelText(/Motivo/);
      await user.type(reasonLabel, 'Falta de respeito');

      await user.click(
        screen.getByRole('button', { name: 'Confirmar suspensão' }),
      );

      await waitFor(() => {
        expect(mockSuspendPlayer).toHaveBeenCalledWith(
          'player-1',
          `${FUTURE_DATE}T23:59:59.999Z`,
          'Falta de respeito',
        );
      });
    });

    it('calls suspendPlayer with empty reason when reason is omitted', async () => {
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Suspender' }));
      fireEvent.change(screen.getByLabelText('Suspenso até'), {
        target: { value: FUTURE_DATE },
      });

      await user.click(
        screen.getByRole('button', { name: 'Confirmar suspensão' }),
      );

      await waitFor(() => {
        expect(mockSuspendPlayer).toHaveBeenCalledWith(
          'player-1',
          `${FUTURE_DATE}T23:59:59.999Z`,
          '',
        );
      });
    });

    it("shows 'Remover' button when player is actively suspended", () => {
      render(
        <PlayerSituationForm
          {...BASE_PROPS}
          suspendedUntil={`${FUTURE_DATE}T23:59:59.999Z`}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Remover' }),
      ).toBeInTheDocument();
    });

    it("calls removeSuspension when 'Remover' is clicked", async () => {
      const user = userEvent.setup();
      render(
        <PlayerSituationForm
          {...BASE_PROPS}
          suspendedUntil={`${FUTURE_DATE}T23:59:59.999Z`}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Remover' }));

      await waitFor(() => {
        expect(mockRemoveSuspension).toHaveBeenCalledWith('player-1');
      });
    });

    it('shows server error when suspendPlayer fails', async () => {
      mockSuspendPlayer.mockResolvedValue({
        error: 'Erro ao suspender jogador.',
      });
      const user = userEvent.setup();
      render(<PlayerSituationForm {...BASE_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Suspender' }));
      fireEvent.change(screen.getByLabelText('Suspenso até'), {
        target: { value: FUTURE_DATE },
      });
      await user.click(
        screen.getByRole('button', { name: 'Confirmar suspensão' }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Erro ao suspender jogador.'),
        ).toBeInTheDocument();
      });
    });
  });
});
