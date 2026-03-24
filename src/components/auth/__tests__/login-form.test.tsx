import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';

const mockLogin = vi.fn();

vi.mock('@/actions/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined); // success by default
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it("renders submit button with text 'Entrar'", () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('renders link to /cadastro', () => {
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: 'Cadastre-se' });
    expect(link).toHaveAttribute('href', '/cadastro');
  });

  it('renders link back to /', () => {
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: /Troque de Perfil/ });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders link to /esqueci-senha', () => {
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: /esqueci a senha/i });
    expect(link).toHaveAttribute('href', '/esqueci-senha');
  });

  describe('validation', () => {
    it("shows 'E-mail inválido' for bad email format", async () => {
      const user = userEvent.setup();
      const { container } = render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
      await user.type(screen.getByLabelText('Senha'), 'secret');
      // Use fireEvent.submit to bypass browser native email validation
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows password error on empty password', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(screen.getByText('Informe a senha')).toBeInTheDocument();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows both errors on completely empty submit', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
        expect(screen.getByText('Informe a senha')).toBeInTheDocument();
      });
    });
  });

  describe('submission', () => {
    it('calls login action with email and password on valid submit', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.type(screen.getByLabelText('Senha'), 'mypassword');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@example.com',
          password: 'mypassword',
        });
      });
    });

    it('shows server error message returned by action', async () => {
      mockLogin.mockResolvedValue({ error: 'E-mail ou senha inválidos.' });
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.type(screen.getByLabelText('Senha'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(
          screen.getByText('E-mail ou senha inválidos.'),
        ).toBeInTheDocument();
      });
    });

    it("shows 'Entrando...' loading state during submission", async () => {
      // Keep the action pending so we can observe the loading state
      mockLogin.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 200)),
      );
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.type(screen.getByLabelText('Senha'), 'mypassword');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(
        screen.getByRole('button', { name: 'Entrando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Entrar' }),
        ).toBeInTheDocument();
      });
    });

    it('clears server error on new submission attempt', async () => {
      mockLogin
        .mockResolvedValueOnce({ error: 'E-mail ou senha inválidos.' })
        .mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.type(screen.getByLabelText('Senha'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(
          screen.getByText('E-mail ou senha inválidos.'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(
          screen.queryByText('E-mail ou senha inválidos.'),
        ).not.toBeInTheDocument();
      });
    });
  });
});
