import type { JWK } from "@supabase/supabase-js";

/**
 * The project's public JWT signing keys, from SUPABASE_JWKS
 * (contents of {SUPABASE_URL}/auth/v1/.well-known/jwks.json).
 *
 * Passing these to getClaims() lets fresh server instances verify sessions
 * without first fetching the JWKS from Supabase. If a token's key id isn't
 * listed (e.g. after a key rotation), getClaims() falls back to fetching it.
 */
export const jwks: { keys: JWK[] } | undefined = (() => {
  const raw = process.env.SUPABASE_JWKS;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.keys) ? parsed : undefined;
  } catch {
    console.error("SUPABASE_JWKS is not valid JSON; fetching keys from Supabase instead");
    return undefined;
  }
})();
