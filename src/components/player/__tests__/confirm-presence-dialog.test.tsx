import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmPresenceDialog } from '../confirm-presence-dialog';

const mockConfirmPresence = vi.fn();

vi.mock('@/actions/player', () => ({
  confirmPresence: (...args: unknown[]) => mockConfirmPresence(...args),
}));

const BASE_PROPS = {
  gameId: 'game-1',
  teamId: 'team-1',
  phone: '11999999999',
  open: true,
  onOpenChange: vi.fn(),
};

describe('ConfirmPresenceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render content when closed', () => {
    mockConfirmPresence.mockResolvedValue({ status: 'confirmed' });
    render(<ConfirmPresenceDialog {...BASE_PROPS} open={false} />);
    expect(screen.queryByText('Confirmando...')).not.toBeInTheDocument();
  });

  it('calls confirmPresence automatically on open with correct params', async () => {
    mockConfirmPresence.mockResolvedValue({ status: 'confirmed' });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(mockConfirmPresence).toHaveBeenCalledWith({
        gameId: 'game-1',
        teamId: 'team-1',
        phone: '11999999999',
      });
    });
  });

  it('shows confirmed step on status confirmed', async () => {
    mockConfirmPresence.mockResolvedValue({ status: 'confirmed' });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Presença confirmada!')).toBeInTheDocument();
    });
  });

  it('shows waitlisted step on status waitlist', async () => {
    mockConfirmPresence.mockResolvedValue({ status: 'waitlist' });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Na lista de espera')).toBeInTheDocument();
    });
  });

  it('shows already_confirmed step', async () => {
    mockConfirmPresence.mockResolvedValue({ alreadyConfirmed: true });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Você já confirmou!')).toBeInTheDocument();
    });
  });

  it('shows banned step', async () => {
    mockConfirmPresence.mockResolvedValue({ banned: true });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Acesso bloqueado')).toBeInTheDocument();
    });
  });

  it('shows suspended step with date and reason', async () => {
    mockConfirmPresence.mockResolvedValue({
      suspended: true,
      until: '2026-05-01T00:00:00.000Z',
      reason: 'Comportamento inadequado',
    });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Jogador suspenso')).toBeInTheDocument();
      expect(screen.getByText(/Comportamento inadequado/)).toBeInTheDocument();
    });
  });

  it('shows error step on action error', async () => {
    mockConfirmPresence.mockResolvedValue({ error: 'Erro interno' });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Erro interno')).toBeInTheDocument();
    });
  });

  it('shows error step when needsRegistration returned', async () => {
    mockConfirmPresence.mockResolvedValue({ needsRegistration: true });
    render(<ConfirmPresenceDialog {...BASE_PROPS} />);

    await waitFor(() => {
      expect(
        screen.getByText('Jogador não encontrado nesta turma.'),
      ).toBeInTheDocument();
    });
  });

  it('calls confirmPresence again when dialog is reopened', async () => {
    mockConfirmPresence.mockResolvedValue({ status: 'confirmed' });
    const { rerender } = render(<ConfirmPresenceDialog {...BASE_PROPS} />);
    await waitFor(() => expect(mockConfirmPresence).toHaveBeenCalledTimes(1));

    rerender(<ConfirmPresenceDialog {...BASE_PROPS} open={false} />);
    rerender(<ConfirmPresenceDialog {...BASE_PROPS} open={true} />);

    await waitFor(() => expect(mockConfirmPresence).toHaveBeenCalledTimes(2));
  });

  describe('waitlist_offer step', () => {
    async function openWaitlistOfferStep() {
      mockConfirmPresence.mockResolvedValueOnce({ gameFull: true });
      const user = userEvent.setup();
      render(<ConfirmPresenceDialog {...BASE_PROPS} />);
      await waitFor(() =>
        expect(screen.getByText('Jogo lotado')).toBeInTheDocument(),
      );
      return user;
    }

    it('shows when game is full', async () => {
      await openWaitlistOfferStep();
      expect(
        screen.getByRole('button', { name: /Entrar na lista de espera/ }),
      ).toBeInTheDocument();
    });

    it('transitions to waitlisted after joining waitlist', async () => {
      const user = await openWaitlistOfferStep();
      mockConfirmPresence.mockResolvedValue({ status: 'waitlist' });

      await user.click(
        screen.getByRole('button', { name: /Entrar na lista de espera/ }),
      );

      await waitFor(() => {
        expect(mockConfirmPresence).toHaveBeenLastCalledWith(
          expect.objectContaining({ joinWaitlist: true, phone: '11999999999' }),
        );
        expect(screen.getByText('Na lista de espera')).toBeInTheDocument();
      });
    });

    it('shows error step when joining waitlist fails', async () => {
      const user = await openWaitlistOfferStep();
      mockConfirmPresence.mockResolvedValue({
        error: 'Erro ao entrar na fila.',
      });

      await user.click(
        screen.getByRole('button', { name: /Entrar na lista de espera/ }),
      );

      await waitFor(() => {
        expect(screen.getByText('Erro ao entrar na fila.')).toBeInTheDocument();
      });
    });

    it('closes via Cancelar button', async () => {
      const onOpenChange = vi.fn();
      mockConfirmPresence.mockResolvedValueOnce({ gameFull: true });
      const user = userEvent.setup();
      render(
        <ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />,
      );
      await waitFor(() =>
        expect(screen.getByText('Jogo lotado')).toBeInTheDocument(),
      );

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('close buttons in terminal steps', () => {
    const terminalCases: Array<{
      label: string;
      mockValue: object;
      heading: string;
    }> = [
      {
        label: 'confirmed',
        mockValue: { status: 'confirmed' },
        heading: 'Presença confirmada!',
      },
      {
        label: 'waitlisted',
        mockValue: { status: 'waitlist' },
        heading: 'Na lista de espera',
      },
      {
        label: 'already_confirmed',
        mockValue: { alreadyConfirmed: true },
        heading: 'Você já confirmou!',
      },
      {
        label: 'banned',
        mockValue: { banned: true },
        heading: 'Acesso bloqueado',
      },
      {
        label: 'error',
        mockValue: { error: 'Falha.' },
        heading: 'Falha.',
      },
    ];

    terminalCases.forEach(({ label, mockValue, heading }) => {
      it(`closes from ${label} step`, async () => {
        mockConfirmPresence.mockResolvedValue(mockValue);
        const onOpenChange = vi.fn();
        const user = userEvent.setup();
        render(
          <ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />,
        );

        await waitFor(() =>
          expect(screen.getByText(heading)).toBeInTheDocument(),
        );

        await user.click(screen.getByRole('button', { name: 'Fechar' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('closes from suspended step', async () => {
      mockConfirmPresence.mockResolvedValue({
        suspended: true,
        until: '2026-05-01T00:00:00Z',
        reason: null,
      });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ConfirmPresenceDialog {...BASE_PROPS} onOpenChange={onOpenChange} />,
      );

      await waitFor(() =>
        expect(screen.getByText('Jogador suspenso')).toBeInTheDocument(),
      );

      await user.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
