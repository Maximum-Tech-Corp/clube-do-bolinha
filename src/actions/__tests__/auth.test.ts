import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRedirect } from '@/test/mocks/next';

// Import actions after mocks are set up
const {
  login,
  logout,
  signup,
  requestPasswordReset,
  updatePassword,
  changePassword,
} = await import('@/actions/auth');

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

describe('requestPasswordReset', () => {
  it('calls resetPasswordForEmail with the provided email', async () => {
    await requestPasswordReset('admin@example.com');

    expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'admin@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback'),
      }),
    );
  });

  it('returns { success: true } when email is sent successfully', async () => {
    const result = await requestPasswordReset('admin@example.com');
    expect(result).toEqual({ success: true });
  });

  it('returns error when resetPasswordForEmail fails', async () => {
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Rate limit exceeded' },
    });

    const result = await requestPasswordReset('admin@example.com');

    expect(result).toEqual({
      error: 'Não foi possível enviar o e-mail. Tente novamente.',
    });
  });
});

describe('updatePassword', () => {
  it('calls auth.updateUser with the new password', async () => {
    await updatePassword('newpassword123');

    expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
      password: 'newpassword123',
    });
  });

  it('signs out and redirects to /login on success', async () => {
    await updatePassword('newpassword123');

    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('returns error when updateUser fails', async () => {
    mockSupabaseAuth.updateUser.mockResolvedValueOnce({
      error: { message: 'update failed' },
    });

    const result = await updatePassword('newpassword123');

    expect(result).toEqual({
      error: 'Não foi possível atualizar a senha. Tente novamente.',
    });
  });

  it('does not sign out or redirect when updateUser fails', async () => {
    mockSupabaseAuth.updateUser.mockResolvedValueOnce({
      error: { message: 'update failed' },
    });

    await updatePassword('newpassword123');

    expect(mockSupabaseAuth.signOut).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe('changePassword', () => {
  beforeEach(() => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-uuid', email: 'admin@example.com' } },
      error: null,
    });
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({ error: null });
    mockSupabaseAuth.updateUser.mockResolvedValue({ error: null });
  });

  it('verifies current password then updates to new password', async () => {
    const result = await changePassword('currentpass', 'newpass123');

    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'currentpass',
    });
    expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
      password: 'newpass123',
    });
    expect(result).toEqual({ success: true });
  });

  it('returns error when session has no user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await changePassword('currentpass', 'newpass123');

    expect(result).toEqual({ error: 'Sessão inválida. Faça login novamente.' });
    expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
  });

  it('returns error when current password is wrong', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    const result = await changePassword('wrongpass', 'newpass123');

    expect(result).toEqual({ error: 'Senha atual incorreta.' });
    expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
  });

  it('returns error when updateUser fails', async () => {
    mockSupabaseAuth.updateUser.mockResolvedValueOnce({
      error: { message: 'update failed' },
    });

    const result = await changePassword('currentpass', 'newpass123');

    expect(result).toEqual({
      error: 'Não foi possível atualizar a senha. Tente novamente.',
    });
  });

  it('does not redirect after changing password', async () => {
    await changePassword('currentpass', 'newpass123');
    expect(mockRedirect).not.toHaveBeenCalled();
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

    // Default: return null (safe fallback for existingAdmin check and unspecified calls)
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );
  });

  it('calls supabase.auth.signUp with email and password', async () => {
    await signup(VALID_DATA);

    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: VALID_DATA.email,
      password: VALID_DATA.password,
    });
  });

  it('returns error when email is already registered', async () => {
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const result = await signup(VALID_DATA);

    expect(result).toEqual({
      error: 'Este e-mail já está vinculado a outra turma de futebol.',
    });
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

  it('returns the auth error message when signUp fails with a generic error', async () => {
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password should be at least 6 characters.' },
    });

    const result = await signup(VALID_DATA);

    expect(result).toEqual({
      error: 'Password should be at least 6 characters.',
    });
  });

  it('returns error when email already has an admin record (fake success guard)', async () => {
    // Supabase fake success: signUp returns a user but they already have an admins record
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'existing-admin-uuid' }, error: null }),
    );

    const result = await signup(VALID_DATA);

    expect(result).toEqual({
      error: 'Este e-mail já está vinculado a outra turma de futebol.',
    });
  });

  it('returns error when admin insert fails', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existingAdmin check — no existing admin
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValueOnce(
        // admins.insert().select().single() — fails
        createQueryMock({ data: null, error: { message: 'insert failed' } }),
      );

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ error: 'Erro ao criar perfil. Tente novamente.' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns { success: true } on full successful signup', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existingAdmin check — no existing admin
        createQueryMock({ data: null, error: null }),
      )
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

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ success: true });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('retries access code generation when a collision is detected', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existingAdmin check — no existing admin
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValueOnce(
        // admins.insert().select().single() — OK
        createQueryMock({ data: { id: 'admin-uuid' }, error: null }),
      )
      .mockReturnValueOnce(
        // teams.select().eq().maybeSingle() — collision: code already exists
        createQueryMock({ data: { id: 'existing-team' }, error: null }),
      )
      .mockReturnValueOnce(
        // teams.select().eq().maybeSingle() — second attempt: no collision
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValueOnce(
        // teams.insert() — OK
        createQueryMock({ data: null, error: null }),
      );

    const result = await signup(VALID_DATA);

    expect(result).toEqual({ success: true });
  });

  it('returns error when team insert fails', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existingAdmin check — no existing admin
        createQueryMock({ data: null, error: null }),
      )
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
