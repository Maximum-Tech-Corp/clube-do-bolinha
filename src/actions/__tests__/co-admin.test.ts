import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseFrom,
  mockSupabaseAuth,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRevalidatePath } from '@/test/mocks/next';

vi.mock('@/lib/admin-context', () => ({
  getAdminContext: vi.fn(),
}));

// Extend the shared auth mock with admin methods
const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
};
Object.assign(mockSupabaseAuth, { admin: mockAuthAdmin });

const { getCoAdmin, setCoAdmin, removeCoAdmin } =
  await import('@/actions/co-admin');
const { getAdminContext } = await import('@/lib/admin-context');
const mockGetAdminContext = vi.mocked(getAdminContext);

const MAIN_ADMIN_CTX = {
  userId: 'user-uuid',
  adminId: 'admin-uuid',
  effectiveAdminId: 'admin-uuid',
  adminName: 'João',
  isCoAdmin: false,
};

describe('getCoAdmin', () => {
  beforeEach(() => {
    mockGetAdminContext.mockResolvedValue(MAIN_ADMIN_CTX);
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );
  });

  it('returns null when there is no admin context', async () => {
    mockGetAdminContext.mockResolvedValue(null);

    const result = await getCoAdmin();

    expect(result).toBeNull();
  });

  it('returns null when called by a co-admin', async () => {
    mockGetAdminContext.mockResolvedValue({
      ...MAIN_ADMIN_CTX,
      isCoAdmin: true,
    });

    const result = await getCoAdmin();

    expect(result).toBeNull();
  });

  it('returns null when no co-admin record exists', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );

    const result = await getCoAdmin();

    expect(result).toBeNull();
  });

  it('returns null when getUserById fails to return an email', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: { id: 'co-admin-id', user_id: 'co-user-uuid' },
        error: null,
      }),
    );
    mockAuthAdmin.getUserById.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getCoAdmin();

    expect(result).toBeNull();
  });

  it('returns the co-admin email when found', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: { id: 'co-admin-id', user_id: 'co-user-uuid' },
        error: null,
      }),
    );
    mockAuthAdmin.getUserById.mockResolvedValue({
      data: { user: { email: 'coadmin@example.com' } },
      error: null,
    });

    const result = await getCoAdmin();

    expect(result).toEqual({ email: 'coadmin@example.com' });
  });
});

describe('setCoAdmin', () => {
  beforeEach(() => {
    mockGetAdminContext.mockResolvedValue(MAIN_ADMIN_CTX);
    // Default: no existing co-admin
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );
    mockAuthAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'new-co-user-uuid' } },
      error: null,
    });
    mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });
  });

  it('returns error when there is no admin context', async () => {
    mockGetAdminContext.mockResolvedValue(null);

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when called by a co-admin', async () => {
    mockGetAdminContext.mockResolvedValue({
      ...MAIN_ADMIN_CTX,
      isCoAdmin: true,
    });

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(result).toEqual({
      error: 'Co-admins não podem definir outro co-admin.',
    });
  });

  it('returns error when a co-admin already exists', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: { id: 'existing-co-id' }, error: null }),
    );

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(result).toEqual({ error: 'Já existe um co-admin definido.' });
  });

  it('returns error when email is already taken', async () => {
    mockAuthAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already exists', status: 422 },
    });

    const result = await setCoAdmin('taken@example.com', 'pass123');

    expect(result).toEqual({
      error: 'Este e-mail já está vinculado a outra turma de futebol.',
    });
  });

  it('returns error message when createUser fails with a non-email error', async () => {
    mockAuthAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Service unavailable', status: 503 },
    });

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(result).toEqual({ error: 'Service unavailable' });
  });

  it('rolls back auth user and returns error when admin insert fails', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existing co-admin check — none
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValue(
        // admins.insert — fails
        createQueryMock({ data: null, error: { message: 'insert error' } }),
      );

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(mockAuthAdmin.deleteUser).toHaveBeenCalledWith('new-co-user-uuid');
    expect(result).toEqual({ error: 'Erro ao configurar co-admin.' });
  });

  it('returns {} and revalidates path on success', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        // existing co-admin check — none
        createQueryMock({ data: null, error: null }),
      )
      .mockReturnValue(
        // admins.insert — succeeds
        createQueryMock({ data: { id: 'new-co-admin-id' }, error: null }),
      );

    const result = await setCoAdmin('co@example.com', 'pass123');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/co-admin');
  });

  it('creates the auth user with email_confirm: true', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    await setCoAdmin('co@example.com', 'pass123');

    expect(mockAuthAdmin.createUser).toHaveBeenCalledWith({
      email: 'co@example.com',
      password: 'pass123',
      email_confirm: true,
    });
  });
});

describe('removeCoAdmin', () => {
  beforeEach(() => {
    mockGetAdminContext.mockResolvedValue(MAIN_ADMIN_CTX);
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: { id: 'co-admin-id', user_id: 'co-user-uuid' },
        error: null,
      }),
    );
    mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });
  });

  it('returns error when there is no admin context', async () => {
    mockGetAdminContext.mockResolvedValue(null);

    const result = await removeCoAdmin();

    expect(result).toEqual({ error: 'Não autorizado.' });
  });

  it('returns error when called by a co-admin', async () => {
    mockGetAdminContext.mockResolvedValue({
      ...MAIN_ADMIN_CTX,
      isCoAdmin: true,
    });

    const result = await removeCoAdmin();

    expect(result).toEqual({
      error: 'Co-admins não podem remover o co-admin.',
    });
  });

  it('returns {} when no co-admin record exists', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );

    const result = await removeCoAdmin();

    expect(result).toEqual({});
    expect(mockAuthAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns error when deleteUser fails', async () => {
    mockAuthAdmin.deleteUser.mockResolvedValue({
      error: { message: 'delete failed' },
    });

    const result = await removeCoAdmin();

    expect(result).toEqual({ error: 'Erro ao remover co-admin.' });
  });

  it('returns {} and revalidates path on success', async () => {
    const result = await removeCoAdmin();

    expect(result).toEqual({});
    expect(mockAuthAdmin.deleteUser).toHaveBeenCalledWith('co-user-uuid');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/co-admin');
  });
});
