import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Serverový Supabase klient se SERVICE ROLE klíčem.
 * POUZE pro použití v API routes / server kódu — NIKDY v prohlížeči.
 * Service role obchází RLS, takže veškerý přístup k datům jde přes naše API.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v prostředí (.env.local)."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
