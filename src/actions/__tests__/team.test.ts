import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';
import { mockRevalidatePath } from '@/test/mocks/next';

const { updateAccessCodePrefix, updateTeamSettings } =
  await import('@/actions/team');

function setupAuthChain() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-uuid', email: 'a@a.com' } },
    error: null,
  });
}

function setupUnauthenticated() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

// ─── updateAccessCodePrefix ───────────────────────────────────────────────────

describe('updateAccessCodePrefix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when prefix is less than 4 chars', async () => {
    const result = await updateAccessCodePrefix('AB');
    expect(result).toEqual({
      error: 'O prefixo deve ter exatamente 4 caracteres alfanuméricos.',
    });
  });

  it('returns error when prefix has special chars (stripped to < 4)', async () => {
    const result = await updateAccessCodePrefix('A!@#');
    // "A!@#" → normalized to "A" (length 1) → invalid
    expect(result).toEqual({
      error: 'O prefixo deve ter exatamente 4 caracteres alfanuméricos.',
    });
  });

  it('returns error when not authenticated', async () => {
    setupUnauthenticated();
    const result = await updateAccessCodePrefix('ABCD');
    expect(result).toEqual({ error: 'Não autenticado.' });
  });

  it('returns error when admin not found', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await updateAccessCodePrefix('ABCD');
    expect(result).toEqual({ error: 'Admin não encontrado.' });
  });

  it('returns error when team not found', async () => {
    setupAuthChain();
    // admins
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    // teams
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await updateAccessCodePrefix('ABCD');
    expect(result).toEqual({ error: 'Turma não encontrada.' });
  });

  it('returns error when code already in use', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'team-1', access_code: 'OLD1-XYZ123' },
        error: null,
      }),
    );
    // uniqueness check: existing found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'team-2' }, error: null }),
    );
    const result = await updateAccessCodePrefix('ABCD');
    expect(result).toEqual({
      error: 'Este código já está em uso. Tente outro prefixo.',
    });
  });

  it('updates code and revalidates on success', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'team-1', access_code: 'OLD1-XYZ123' },
        error: null,
      }),
    );
    // uniqueness check: not found
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await updateAccessCodePrefix('NEWP');

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('normalizes prefix to uppercase', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({
        data: { id: 'team-1', access_code: 'OLD1-XYZ123' },
        error: null,
      }),
    );
    // no conflict
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await updateAccessCodePrefix('abcd');

    // Should succeed — "abcd" normalized to "ABCD" (4 chars)
    expect(result).toEqual({});
  });
});

// ─── updateTeamSettings ───────────────────────────────────────────────────────

describe('updateTeamSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when teamName is empty', async () => {
    const result = await updateTeamSettings({
      matchDurationMinutes: 20,
      teamName: '  ',
    });
    expect(result).toEqual({ error: 'O nome da turma não pode ser vazio.' });
  });

  it('returns error when not authenticated', async () => {
    setupUnauthenticated();
    const result = await updateTeamSettings({
      matchDurationMinutes: 20,
      teamName: 'Turma A',
    });
    expect(result).toEqual({ error: 'Não autenticado.' });
  });

  it('returns error when admin not found', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );
    const result = await updateTeamSettings({
      matchDurationMinutes: 20,
      teamName: 'Turma A',
    });
    expect(result).toEqual({ error: 'Admin não encontrado.' });
  });

  it('updates settings and revalidates on success', async () => {
    setupAuthChain();
    // admins
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    // update
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const result = await updateTeamSettings({
      matchDurationMinutes: 30,
      teamName: 'Turma Atualizada',
    });

    expect(result).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('floors fractional minutes to at least 1', async () => {
    setupAuthChain();
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: { id: 'admin-1' }, error: null }),
    );
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    // Passing 0 → Math.max(1, floor(0)) = 1
    const result = await updateTeamSettings({
      matchDurationMinutes: 0,
      teamName: 'Turma',
    });

    expect(result).toEqual({});
  });
});
