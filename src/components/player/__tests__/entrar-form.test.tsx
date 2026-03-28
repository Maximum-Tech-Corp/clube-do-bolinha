import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntrarForm } from '../entrar-form';

const mockIdentifyPlayer = vi.fn();
const mockRegisterPlayer = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/actions/player', () => ({
  identifyPlayer: (...args: unknown[]) => mockIdentifyPlayer(...args),
  registerPlayer: (...args: unknown[]) => mockRegisterPlayer(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const BASE_PROPS = {
  teamId: 'team-1',
  teamCode: 'BOLA-ABC',
};

describe('EntrarForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── phone step ──

  it('renders phone input and submit button', () => {
    render(<EntrarForm {...BASE_PROPS} />);
    expect(screen.getByLabelText(/celular/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('applies phone mask as the user types', async () => {
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '85987257171');

    expect(screen.getByLabelText(/celular/i)).toHaveValue('(85) 98725-7171');
  });

  it('strips formatting before sending to the action when phone is typed with mask characters', async () => {
    mockIdentifyPlayer.mockResolvedValue({ identified: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    // simulates pasting or typing an already-formatted number
    await user.type(screen.getByLabelText(/celular/i), '(85) 98725-7171');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockIdentifyPlayer).toHaveBeenCalledWith({
        teamId: 'team-1',
        phone: '85987257171',
      });
    });
  });

  it('shows validation error when phone is too short', async () => {
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Informe um celular válido/)).toBeInTheDocument();
    });
  });

  it('calls identifyPlayer with correct params on submit', async () => {
    mockIdentifyPlayer.mockResolvedValue({ identified: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockIdentifyPlayer).toHaveBeenCalledWith({
        teamId: 'team-1',
        phone: '11999999999',
      });
    });
  });

  it('shows server error when identifyPlayer returns an error', async () => {
    mockIdentifyPlayer.mockResolvedValue({ error: 'Erro interno do servidor' });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro interno do servidor')).toBeInTheDocument();
    });
  });

  it('redirects to player page when identified', async () => {
    mockIdentifyPlayer.mockResolvedValue({ identified: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/jogador/BOLA-ABC');
    });
  });

  it('shows banned step when player is banned', async () => {
    mockIdentifyPlayer.mockResolvedValue({ banned: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Acesso bloqueado')).toBeInTheDocument();
    });
  });

  it('shows suspended step with date when player is suspended', async () => {
    mockIdentifyPlayer.mockResolvedValue({
      suspended: true,
      until: '2026-12-01T00:00:00.000Z',
      reason: 'Conduta ruim',
    });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Suspenso até/)).toBeInTheDocument();
      expect(screen.getByText(/Conduta ruim/)).toBeInTheDocument();
    });
  });

  it('transitions to register step when needsRegistration', async () => {
    mockIdentifyPlayer.mockResolvedValue({ needsRegistration: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeiro acesso')).toBeInTheDocument();
      expect(screen.getByLabelText(/Nome ou apelido/i)).toBeInTheDocument();
    });
  });

  // ── register step ──

  it('calls registerPlayer and redirects on successful registration', async () => {
    mockIdentifyPlayer.mockResolvedValue({ needsRegistration: true });
    mockRegisterPlayer.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    // reach register step
    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Primeiro acesso')).toBeInTheDocument(),
    );

    // fill register form
    await user.type(screen.getByLabelText(/Nome ou apelido/i), 'João');
    await user.type(screen.getByLabelText(/Peso/i), '75');

    // select stamina via the hidden select — simulate value change
    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText('3 jogos'));

    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockRegisterPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-1',
          phone: '11999999999',
          name: 'João',
          weight_kg: 75,
          stamina: '3',
        }),
      );
      expect(mockRouterPush).toHaveBeenCalledWith('/jogador/BOLA-ABC');
    });
  });

  it('shows server error on registerPlayer failure', async () => {
    mockIdentifyPlayer.mockResolvedValue({ needsRegistration: true });
    mockRegisterPlayer.mockResolvedValue({
      error: 'Erro ao registrar. Tente novamente.',
    });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);

    // reach register step
    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Primeiro acesso')).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText(/Nome ou apelido/i), 'João');
    await user.type(screen.getByLabelText(/Peso/i), '75');

    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText('3 jogos'));

    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Erro ao registrar. Tente novamente.'),
      ).toBeInTheDocument();
    });
  });

  // ── register form validation errors ──

  async function reachRegisterStep() {
    mockIdentifyPlayer.mockResolvedValue({ needsRegistration: true });
    const user = userEvent.setup();
    render(<EntrarForm {...BASE_PROPS} />);
    await user.type(screen.getByLabelText(/celular/i), '11999999999');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Primeiro acesso')).toBeInTheDocument(),
    );
    return user;
  }

  it('shows name validation error when name is too short', async () => {
    const user = await reachRegisterStep();

    await user.type(screen.getByLabelText(/Nome ou apelido/i), 'A');
    await user.type(screen.getByLabelText(/Peso/i), '75');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
    });
  });

  it('shows weight validation error when weight is below minimum', async () => {
    const user = await reachRegisterStep();

    await user.type(screen.getByLabelText(/Nome ou apelido/i), 'João');
    await user.type(screen.getByLabelText(/Peso/i), '10');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen
          .getByLabelText(/Peso/i)
          .closest('.space-y-1')!
          .querySelector('p'),
      ).toBeInTheDocument();
    });
  });

  it('shows stamina validation error when stamina is not selected', async () => {
    const user = await reachRegisterStep();

    await user.type(screen.getByLabelText(/Nome ou apelido/i), 'João');
    await user.type(screen.getByLabelText(/Peso/i), '75');
    // deliberately skip stamina selection
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen
          .getByText(/Resistência/)
          .closest('.space-y-1')!
          .querySelector('p'),
      ).toBeInTheDocument();
    });
  });
});
