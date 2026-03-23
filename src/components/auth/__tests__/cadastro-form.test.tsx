import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CadastroForm } from '../cadastro-form';
import { mockPush } from '@/test/mocks/next';

const mockSignup = vi.fn();

vi.mock('@/actions/auth', () => ({
  login: vi.fn(),
  signup: (...args: unknown[]) => mockSignup(...args),
  logout: vi.fn(),
}));

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo'), 'João Silva');
  await user.type(screen.getByLabelText('E-mail'), 'joao@example.com');
  await user.type(screen.getByLabelText('Celular'), '11999999999');
  await user.type(screen.getByLabelText('Nome da turma'), 'Os Cracks');
  await user.type(screen.getByLabelText('Senha'), 'secret123');
  await user.type(screen.getByLabelText('Confirmar senha'), 'secret123');
}

describe('CadastroForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignup.mockResolvedValue({ success: true });
  });

  describe('rendering', () => {
    it('renders all required fields', () => {
      render(<CadastroForm />);
      expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Celular')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome da turma')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<CadastroForm />);
      expect(
        screen.getByRole('button', { name: 'Criar conta' }),
      ).toBeInTheDocument();
    });

    it('renders link back to /login', () => {
      render(<CadastroForm />);
      const link = screen.getByRole('link', { name: 'Entrar' });
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  describe('validation', () => {
    it('shows error when name is too short', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await user.type(screen.getByLabelText('Nome completo'), 'A');
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(
          screen.getByText('Informe seu nome completo'),
        ).toBeInTheDocument();
      });
      expect(mockSignup).not.toHaveBeenCalled();
    });

    it("shows 'E-mail inválido' for bad email format", async () => {
      const user = userEvent.setup();
      const { container } = render(<CadastroForm />);

      await user.type(screen.getByLabelText('E-mail'), 'not-email');
      // Use fireEvent.submit to bypass browser native email validation
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
      });
    });

    it('shows error when phone is too short', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await user.type(screen.getByLabelText('Celular'), '12345');
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(
          screen.getByText('Informe um celular válido'),
        ).toBeInTheDocument();
      });
    });

    it('shows error when team name is too short', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await user.type(screen.getByLabelText('Nome da turma'), 'A');
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('Informe o nome da turma')).toBeInTheDocument();
      });
    });

    it('shows error when password has fewer than 6 characters', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await user.type(screen.getByLabelText('Senha'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
      });
    });

    it("shows error when passwords don't match", async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await user.type(screen.getByLabelText('Nome completo'), 'João Silva');
      await user.type(screen.getByLabelText('E-mail'), 'joao@example.com');
      await user.type(screen.getByLabelText('Celular'), '11999999999');
      await user.type(screen.getByLabelText('Nome da turma'), 'Os Cracks');
      await user.type(screen.getByLabelText('Senha'), 'secret123');
      await user.type(screen.getByLabelText('Confirmar senha'), 'different456');
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
      });
      expect(mockSignup).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls signup action with all form data on valid submit', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '11999999999',
          teamName: 'Os Cracks',
          password: 'secret123',
          confirmPassword: 'secret123',
        });
      });
    });

    it('shows server error returned by action', async () => {
      mockSignup.mockResolvedValue({ error: 'E-mail já cadastrado.' });
      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('E-mail já cadastrado.')).toBeInTheDocument();
      });
    });

    it("shows 'Criando conta...' loading state during submission", async () => {
      mockSignup.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve({ success: true }), 200)),
      );
      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      expect(
        screen.getByRole('button', { name: 'Criando conta...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument();
      });
    });

    it('clears server error on new submission attempt', async () => {
      mockSignup
        .mockResolvedValueOnce({ error: 'Erro de servidor.' })
        .mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('Erro de servidor.')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.queryByText('Erro de servidor.')).not.toBeInTheDocument();
      });
    });

    it('shows email confirmation modal on successful signup', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument();
        expect(
          screen.getByText(/Confirme seu cadastro antes de fazer login/),
        ).toBeInTheDocument();
      });
    });

    it('navigates to /pagamento-pendente after confirming email modal', async () => {
      const user = userEvent.setup();
      render(<CadastroForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: 'Criar conta' }));

      await waitFor(() => {
        expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Ok' }));

      expect(mockPush).toHaveBeenCalledWith('/pagamento-pendente');
    });
  });
});
