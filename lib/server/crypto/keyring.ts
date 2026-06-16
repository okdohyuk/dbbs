import "server-only";
import { scryptSync, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import fs from "node:fs";
import path from "node:path";
import { masterSecret } from "@/lib/server/config";

// Fixed salt: the master secret is the real entropy source. A static salt keeps
// derivation deterministic across restarts so previously-encrypted passwords
// remain decryptable.
const SCRYPT_SALT = "dbbs.master.v1";

let cachedKey: Buffer | null = null;

function keyfilePath(): string {
  const base = process.env.DBBS_HOME || path.join(homedir(), ".dbbs");
  return path.join(base, ".keyfile");
}

/** Read an existing keyfile or create one (0600) with 48 random bytes. */
function loadOrCreateKeyfileSecret(): string {
  const file = keyfilePath();
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const secret = randomBytes(48).toString("base64");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

/** 32-byte AES-256 key derived from the master secret (or generated keyfile). */
export function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = masterSecret() ?? loadOrCreateKeyfileSecret();
  cachedKey = scryptSync(secret, SCRYPT_SALT, 32);
  return cachedKey;
}

/** Whether a master secret is configured via env (vs. a generated keyfile). */
export function hasEnvMasterSecret(): boolean {
  return Boolean(masterSecret());
}
