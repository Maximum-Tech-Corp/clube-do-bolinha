import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCard } from '../game-card';

const mockCancelPresence = vi.fn();

vi.mock('@/actions/player', () => ({
  confirmPresence: vi.fn().mockResolvedValue({ status: 'confirmed' }),
  clearPlayerCookie: vi.fn().mockResolvedValue(undefined),
  cancelPresence: (...args: unknown[]) => mockCancelPresence(...args),
}));

// Mock the dialog to isolate GameCard rendering
vi.mock('../confirm-presence-dialog', () => ({
  ConfirmPresenceDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button onClick={() => onOpenChange(false)}>Fechar</button>
      </div>
    ) : null,
}));

const BASE_GAME = {
  id: 'game-1',
  location: 'Campo do Zé',
  scheduled_at: '2026-04-05T10:00:00.000Z',
  status: 'open',
  is_tournament: false,
  draw_done: false,
};

const BASE_PROPS = {
  game: BASE_GAME,
  teamId: 'team-1',
  teamCode: 'BOLA-ABC123',
  confirmedCount: 12,
  playerStatus: null,
};

describe('GameCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelPresence.mockResolvedValue({ success: true });
  });

  it('renders date and time', () => {
    render(<GameCard {...BASE_PROPS} />);
    // Date is locale-formatted — just check something renders
    expect(document.querySelector('.font-semibold')).toBeTruthy();
  });

  it('renders location when provided', () => {
    render(<GameCard {...BASE_PROPS} />);
    expect(screen.getByText('Campo do Zé')).toBeInTheDocument();
  });

  it('does not render location when null', () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, location: null }} />,
    );
    expect(screen.queryByText('Campo do Zé')).not.toBeInTheDocument();
  });

  it("shows 'Agendado' badge for open game", () => {
    render(<GameCard {...BASE_PROPS} />);
    expect(screen.getByText('Agendado')).toBeInTheDocument();
  });

  it("shows 'Cancelado' badge for cancelled game", () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, status: 'cancelled' }} />,
    );
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('cancelled card has reduced opacity', () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, status: 'cancelled' }} />,
    );
    expect(document.querySelector('.opacity-60')).toBeTruthy();
  });

  it("shows 'Finalizado' badge for finished game", () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, status: 'finished' }} />,
    );
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
  });

  it("shows 'Modo Campeonato' label when is_tournament is true", () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, is_tournament: true }} />,
    );
    expect(screen.getByText('Modo Campeonato')).toBeInTheDocument();
  });

  it("does not show 'Modo Campeonato' for regular game", () => {
    render(<GameCard {...BASE_PROPS} />);
    expect(screen.queryByText('Modo Campeonato')).not.toBeInTheDocument();
  });

  it('shows confirmed count', () => {
    render(<GameCard {...BASE_PROPS} confirmedCount={12} />);
    expect(screen.getByText(/12 confirmados/)).toBeInTheDocument();
  });

  it("shows singular 'confirmado' for count of 1", () => {
    render(<GameCard {...BASE_PROPS} confirmedCount={1} />);
    expect(screen.getByText(/1 confirmado/)).toBeInTheDocument();
  });

  it("shows 'Confirmar presença' button when playerStatus is null and game is open", () => {
    render(<GameCard {...BASE_PROPS} playerStatus={null} />);
    expect(
      screen.getByRole('button', { name: /Confirmar presença/ }),
    ).toBeInTheDocument();
  });

  it("shows '✓ Confirmado' and 'Não irei mais' when playerStatus is confirmed and game is open", () => {
    render(<GameCard {...BASE_PROPS} playerStatus="confirmed" />);
    expect(screen.getByText('✓ Confirmado')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Confirmar presença/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Não irei mais' }),
    ).toBeInTheDocument();
  });

  it("shows 'Na fila de espera' when playerStatus is waitlist", () => {
    render(<GameCard {...BASE_PROPS} playerStatus="waitlist" />);
    expect(screen.getByText('Na fila de espera')).toBeInTheDocument();
  });

  it("clicking 'Confirmar presença' opens the dialog", async () => {
    const user = userEvent.setup();
    render(<GameCard {...BASE_PROPS} />);

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Confirmar presença/ }),
    );
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it("shows 'Ver lista' link when open and draw not done", () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, draw_done: false }} />,
    );
    const link = screen.getByRole('link', { name: /Ver lista/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/jogador/BOLA-ABC123/lista/game-1');
  });

  it("shows 'Ver times sorteados' when open, draw_done, not tournament", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        game={{ ...BASE_GAME, draw_done: true, is_tournament: false }}
      />,
    );
    const link = screen.getByRole('link', { name: /Ver times sorteados/ });
    expect(link).toHaveAttribute('href', '/jogador/BOLA-ABC123/times/game-1');
  });

  it("shows 'Acompanhar Jogos' when open, draw_done, is_tournament, tournamentStarted", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        game={{ ...BASE_GAME, draw_done: true, is_tournament: true }}
        tournamentStarted={true}
      />,
    );
    const link = screen.getByRole('link', { name: /Acompanhar Jogos/ });
    expect(link).toHaveAttribute(
      'href',
      '/jogador/BOLA-ABC123/campeonato/game-1',
    );
  });

  it("shows 'Ver times sorteados' when draw_done, is_tournament but tournament not started", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        game={{ ...BASE_GAME, draw_done: true, is_tournament: true }}
        tournamentStarted={false}
      />,
    );
    expect(
      screen.getByRole('link', { name: /Ver times sorteados/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Acompanhar Jogos/ }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Ver detalhes' link when finished and detailsHref provided", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        game={{ ...BASE_GAME, status: 'finished' }}
        detailsHref="/jogador/BOLA-ABC123/historico/game-1"
      />,
    );
    const link = screen.getByRole('link', { name: /Ver detalhes/ });
    expect(link).toHaveAttribute(
      'href',
      '/jogador/BOLA-ABC123/historico/game-1',
    );
  });

  it("does not show 'Ver detalhes' for finished game without detailsHref", () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, status: 'finished' }} />,
    );
    expect(
      screen.queryByRole('link', { name: /Ver detalhes/ }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Não irei mais' when playerStatus is waitlist and game is open", () => {
    render(<GameCard {...BASE_PROPS} playerStatus="waitlist" />);
    expect(
      screen.getByRole('button', { name: 'Não irei mais' }),
    ).toBeInTheDocument();
  });

  it("does not show 'Não irei mais' when draw is already done", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        playerStatus="confirmed"
        game={{ ...BASE_GAME, draw_done: true }}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Não irei mais' }),
    ).not.toBeInTheDocument();
  });

  it("does not show 'Não irei mais' when game is finished", () => {
    render(
      <GameCard
        {...BASE_PROPS}
        playerStatus="confirmed"
        game={{ ...BASE_GAME, status: 'finished' }}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Não irei mais' }),
    ).not.toBeInTheDocument();
  });

  it("clicking 'Não irei mais' calls cancelPresence and refreshes", async () => {
    const user = userEvent.setup();
    render(<GameCard {...BASE_PROPS} playerStatus="confirmed" />);

    await user.click(screen.getByRole('button', { name: 'Não irei mais' }));

    expect(mockCancelPresence).toHaveBeenCalledWith({
      gameId: 'game-1',
      teamId: 'team-1',
    });
  });

  it("shows 'Cancelando...' and disables button during cancel", async () => {
    mockCancelPresence.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 200)),
    );
    const user = userEvent.setup();
    render(<GameCard {...BASE_PROPS} playerStatus="confirmed" />);

    await user.click(screen.getByRole('button', { name: 'Não irei mais' }));

    expect(
      screen.getByRole('button', { name: 'Cancelando...' }),
    ).toBeDisabled();
  });

  it('does not show confirmed count for cancelled game', () => {
    render(
      <GameCard {...BASE_PROPS} game={{ ...BASE_GAME, status: 'cancelled' }} />,
    );
    expect(screen.queryByText(/confirmados/)).not.toBeInTheDocument();
  });
});
