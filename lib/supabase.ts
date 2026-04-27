import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Both keys MUST be set. We fail loud rather than no-op silently.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env.',
  );
}

// Browser-safe singleton. Anon key is designed to ship in the bundle; RLS gates writes.
export const browserClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Server-only. Service role bypasses RLS — never import this from a 'use client' file.
// Function-form so the env var is read on call, not at module load (clearer errors).
export const serverClient = (): SupabaseClient => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server-only).');
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
};
