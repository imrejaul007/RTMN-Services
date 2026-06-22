import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row Level Security (RLS) and should only be used in:
 * - API routes
 * - Server-side utility functions
 * - Background jobs
 *
 * NEVER expose this client to the client-side.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables: ' +
      `${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : ''} ` +
      `${!serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Singleton instance for API routes.
 * Reuse the client across requests for connection pooling benefits.
 */
let serverClient: ReturnType<typeof createClient> | null = null;

export function getServerClient() {
  if (!serverClient) {
    serverClient = createServerClient();
  }
  return serverClient;
}
