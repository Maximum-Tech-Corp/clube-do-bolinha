import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

/** Cliente autenticado — usa anon key + RLS. Para operações do admin. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Em Server Components o set é ignorado (sem impacto)
          }
        },
      },
    },
  );
}

/**
 * Cliente com service_role — bypassa RLS.
 * Usar exclusivamente em Server Actions para operações de jogadores (sem auth).
 * NUNCA expor no client-side.
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    },
  );
}
