import { vi } from 'vitest';

/**
 * Creates a chainable Supabase query mock.
 * Each method returns `this` to allow chaining, ending with
 * `maybeSingle`, `single`, or implicit resolution returning { data, error }.
 *
 * Usage:
 *   mockSupabaseClient.from.mockReturnValue(
 *     createQueryMock({ data: [...], error: null })
 *   );
 */
export function createQueryMock(
  result: { data: unknown; error: unknown; count?: number } = {
    data: null,
    error: null,
  },
) {
  const chain: Record<string, unknown> = {};

  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'gte',
    'lte',
    'gt',
    'lt',
    'order',
    'limit',
    'filter',
    'match',
    'is',
    'not',
    'or',
    'ilike',
    'like',
  ];

  methods.forEach(m => {
    chain[m] = vi.fn(() => chain);
  });

  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);

  // Allow awaiting the chain directly (returns result)
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' });

  return chain;
}

// The mock client returned by createClient / createServiceClient
export const mockSupabaseFrom = vi.fn();
export const mockSupabaseAuth = {
  getUser: vi.fn<
    () => Promise<{
      data: { user: { id: string; email?: string } | null };
      error: null;
    }>
  >(() => Promise.resolve({ data: { user: null }, error: null })),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  resetPasswordForEmail: vi.fn<
    () => Promise<{ error: null | { message: string } }>
  >(() => Promise.resolve({ error: null })),
  updateUser: vi.fn<() => Promise<{ error: null | { message: string } }>>(() =>
    Promise.resolve({ error: null }),
  ),
};

export const mockSupabaseClient = {
  from: mockSupabaseFrom,
  auth: mockSupabaseAuth,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  createServiceClient: vi.fn(() => mockSupabaseClient),
}));
