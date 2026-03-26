import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';

const { getAdminContext, getEffectiveTeamId } =
  await import('@/lib/admin-context');

describe('getAdminContext', () => {
  beforeEach(() => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-uuid' } },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: { id: 'admin-uuid', name: 'João', co_admin_of: null },
        error: null,
      }),
    );
  });

  it('returns null when there is no authenticated user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getAdminContext();

    expect(result).toBeNull();
  });

  it('returns null when admin record is not found', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: null, error: null }),
    );

    const result = await getAdminContext();

    expect(result).toBeNull();
  });

  it('returns correct context for a regular admin', async () => {
    const result = await getAdminContext();

    expect(result).toEqual({
      userId: 'user-uuid',
      adminId: 'admin-uuid',
      effectiveAdminId: 'admin-uuid',
      adminName: 'João',
      isCoAdmin: false,
    });
  });

  it('returns correct context for a co-admin', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: {
          id: 'co-admin-uuid',
          name: 'Maria',
          co_admin_of: 'main-admin-uuid',
        },
        error: null,
      }),
    );

    const result = await getAdminContext();

    expect(result).toEqual({
      userId: 'user-uuid',
      adminId: 'co-admin-uuid',
      effectiveAdminId: 'main-admin-uuid',
      adminName: 'Maria',
      isCoAdmin: true,
    });
  });

  it('sets effectiveAdminId to own adminId when co_admin_of is null', async () => {
    const result = await getAdminContext();

    expect(result?.effectiveAdminId).toBe('admin-uuid');
    expect(result?.isCoAdmin).toBe(false);
  });

  it('sets effectiveAdminId to co_admin_of when user is a co-admin', async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: {
          id: 'co-admin-uuid',
          name: 'Maria',
          co_admin_of: 'main-admin-uuid',
        },
        error: null,
      }),
    );

    const result = await getAdminContext();

    expect(result?.effectiveAdminId).toBe('main-admin-uuid');
    expect(result?.isCoAdmin).toBe(true);
  });
});

describe('getEffectiveTeamId', () => {
  beforeEach(() => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-uuid' } },
      error: null,
    });
    mockSupabaseFrom
      .mockReturnValueOnce(
        createQueryMock({
          data: { id: 'admin-uuid', name: 'João', co_admin_of: null },
          error: null,
        }),
      )
      .mockReturnValue(
        createQueryMock({ data: { id: 'team-uuid' }, error: null }),
      );
  });

  it('returns null when there is no authenticated user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getEffectiveTeamId();

    expect(result).toBeNull();
  });

  it('returns the team id for a regular admin', async () => {
    const result = await getEffectiveTeamId();

    expect(result).toBe('team-uuid');
  });

  it('returns null when the team is not found', async () => {
    // Reset to clear the Once queue set in beforeEach before adding our own
    mockSupabaseFrom.mockReset();
    mockSupabaseFrom
      .mockReturnValueOnce(
        createQueryMock({
          data: { id: 'admin-uuid', name: 'João', co_admin_of: null },
          error: null,
        }),
      )
      .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

    const result = await getEffectiveTeamId();

    expect(result).toBeNull();
  });

  it('queries the team using effectiveAdminId (co_admin_of) for a co-admin', async () => {
    // Reset to clear the Once queue set in beforeEach before adding our own
    mockSupabaseFrom.mockReset();
    mockSupabaseFrom
      .mockReturnValueOnce(
        createQueryMock({
          data: {
            id: 'co-admin-uuid',
            name: 'Maria',
            co_admin_of: 'main-admin-uuid',
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryMock({ data: { id: 'team-uuid' }, error: null }),
      );

    await getEffectiveTeamId();

    // The second from() call (teams) must use main admin's id
    const teamsChain = mockSupabaseFrom.mock.results[1].value;
    expect(teamsChain.eq).toHaveBeenCalledWith('admin_id', 'main-admin-uuid');
  });
});
