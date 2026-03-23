import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRedirect } from '@/test/mocks/next';

// Import actions after mocks are set up
const { login, logout, signup } = await import('@/actions/auth');

describe('login', () => {
  beforeEach(() => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({ error: null });
  });

  it('calls supabase.auth.signInWithPassword with provided credentials', async () => {
    await login({ email: 'admin@example.com', password: 'pass123' });

    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'pass123',
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    await login({ email: 'admin@example.com', password: 'pass123' });
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error message on failed login', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    const result = await login({
      email: 'admin@example.com',
      password: 'wrong',
    });

    expect(result).toEqual({ error: 'E-mail ou senha inválidos.' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('does not redirect on login failure', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid' },
    });

    await login({ email: 'x@x.com', password: 'y' });

    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('calls supabase.auth.signOut', async () => {
    await logout();
    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
  });

  it('redirects to /login after sign out', async () => {
    await logout();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});

describe('signup', () => {
  const VALID_DATA = {
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '11999999999',
    teamName: 'Os Cracks',
    password: 'secret123',
  };

  beforeEach(() => {
    // signUp succeeds and returns a user
    mockSupabaseAuth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-uuid' } },
      error: null,
    });

    // Admin insert succeeds
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
    );
  });

  it('calls supabase.auth.signUp with email and password', async () => {
    await signup(VALID_DATA);

    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: VALID_DATA.email,
      password: VALID_DATA.password,
    });
  });

  it('returns auth error when signUp fails', async () => {
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ error: 'User already registered' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns error when signUp returns no user', async () => {
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ error: 'Erro ao criar conta.' });
  });

  it('returns error when admin insert fails', async () => {
    // First call (admins insert) returns error
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: { message: 'insert failed' } }),
    );

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ error: 'Erro ao criar perfil. Tente novamente.' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /pagamento-pendente on full success', async () => {
    // Admin insert succeeds; team duplicate check returns no existing; team insert succeeds
    mockSupabaseFrom
      .mockReturnValueOnce(
        // admins.insert().select().single()
        createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
      )
      .mockReturnValueOnce(
        // teams.select().eq().maybeSingle() — no duplicate
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValueOnce(
        // teams.insert()
        createQueryMock({ data: null, error: null }),
      );

    await signup(VALID_DATA);

    expect(mockRedirect).toHaveBeenCalledWith('/pagamento-pendente');
  });

  it('returns error when team insert fails', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // admins.insert().select().single() — OK
        createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
      )
      .mockReturnValueOnce(
        // teams.select().eq().maybeSingle() — no duplicate
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValueOnce(
        // teams.insert() — fails
        createQueryMock({
          data: null,
          error: { message: 'team insert error' },
        }),
      );

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ error: 'Erro ao criar turma. Tente novamente.' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
