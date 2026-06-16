import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { masterKey } from "@/lib/server/crypto/keyring";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length

/** Encrypt a plaintext secret. Output: base64(iv):base64(authTag):base64(cipher). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Decrypt a value produced by {@link encryptSecret}. Throws if tampered. */
export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
