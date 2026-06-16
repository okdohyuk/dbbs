// Signed session tokens using Web Crypto (HMAC-SHA256). Works in both the Edge
// runtime (middleware) and the Node runtime (server actions) — no node-only deps.
import { authSecret, SESSION_TTL_MS } from "@/lib/auth/config";

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToStr(value: string): string {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacB64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/** Create a signed session token valid for SESSION_TTL_MS. */
export async function createSessionToken(now: number): Promise<string> {
  const payload = strToB64url(JSON.stringify({ exp: now + SESSION_TTL_MS }));
  const sig = await hmacB64url(authSecret(), payload);
  return `${payload}.${sig}`;
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(token: string, now: number): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacB64url(authSecret(), payload);
  if (!timingSafeStringEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(b64urlToStr(payload)) as { exp?: number };
    return typeof data.exp === "number" && data.exp > now;
  } catch {
    return false;
  }
}

/** Constant-length, constant-time password check via SHA-256 digests. */
export async function passwordMatches(provided: string, expected: string): Promise<boolean> {
  const digest = async (s: string) =>
    bytesToB64url(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
    );
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  return timingSafeStringEqual(a, b);
}
