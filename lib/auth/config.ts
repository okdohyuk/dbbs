// Auth config — readable from both the Edge middleware and Node server actions.
// No "server-only" here: middleware must import it.

export const SESSION_COOKIE = "dbbs_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** The password gate is active only when DBBS_PASSWORD is set. */
export function authEnabled(): boolean {
  return Boolean(process.env.DBBS_PASSWORD);
}

export function authPassword(): string | undefined {
  return process.env.DBBS_PASSWORD || undefined;
}

/** Secret used to sign session tokens (falls back to the master key). */
export function authSecret(): string {
  return (
    process.env.DBBS_AUTH_SECRET ||
    process.env.DBBS_MASTER_KEY ||
    "dbbs-dev-insecure-secret"
  );
}
