import "server-only";
import { decryptSecret } from "@/lib/server/crypto/cipher";
import { getConnection } from "@/lib/server/store/repos/connections";
import type { Connection } from "@/lib/types";
import type { ConnectionConfig } from "@/lib/server/db/adapter";

/** Build a runnable connection config from a stored connection (decrypts pw). */
export function toConfig(conn: Connection, database?: string): ConnectionConfig {
  return {
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: decryptSecret(conn.passwordEnc),
    database: database ?? conn.defaultDatabase ?? undefined,
  };
}

export async function loadConnectionConfig(
  id: string,
  database?: string,
): Promise<{ conn: Connection; cfg: ConnectionConfig } | null> {
  const conn = await getConnection(id);
  if (!conn) return null;
  return { conn, cfg: toConfig(conn, database) };
}
