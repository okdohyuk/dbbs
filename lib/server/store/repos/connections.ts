import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/server/store/client";
import { ensureMigrated } from "@/lib/server/store/migrate";
import { connections } from "@/lib/server/store/schema";
import { encryptSecret } from "@/lib/server/crypto/cipher";
import type { Connection, Engine } from "@/lib/types";

export async function listConnections(projectId?: string): Promise<Connection[]> {
  await ensureMigrated();
  const db = getDb();
  const q = db.select().from(connections);
  const rows = projectId
    ? await q.where(eq(connections.projectId, projectId)).orderBy(desc(connections.createdAt))
    : await q.orderBy(desc(connections.createdAt));
  return rows;
}

export async function getConnection(id: string): Promise<Connection | null> {
  await ensureMigrated();
  const rows = await getDb().select().from(connections).where(eq(connections.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createConnection(input: {
  projectId: string;
  name: string;
  engine: Engine;
  host: string;
  port: number;
  user: string;
  password: string;
  defaultDatabase?: string | null;
}): Promise<Connection> {
  await ensureMigrated();
  const rows = await getDb()
    .insert(connections)
    .values({
      projectId: input.projectId,
      name: input.name,
      engine: input.engine,
      host: input.host,
      port: input.port,
      user: input.user,
      passwordEnc: encryptSecret(input.password),
      defaultDatabase: input.defaultDatabase ?? null,
    })
    .returning();
  return rows[0];
}

export async function updateConnection(
  id: string,
  input: {
    name?: string;
    host?: string;
    port?: number;
    user?: string;
    /** plaintext; only re-encrypted when provided */
    password?: string;
    defaultDatabase?: string | null;
  },
): Promise<Connection | null> {
  await ensureMigrated();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.host !== undefined) patch.host = input.host;
  if (input.port !== undefined) patch.port = input.port;
  if (input.user !== undefined) patch.user = input.user;
  if (input.defaultDatabase !== undefined) patch.defaultDatabase = input.defaultDatabase;
  if (input.password) patch.passwordEnc = encryptSecret(input.password);

  const rows = await getDb()
    .update(connections)
    .set(patch)
    .where(eq(connections.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function markConnectionTested(
  id: string,
  serverVersion: string | null,
): Promise<void> {
  await ensureMigrated();
  await getDb()
    .update(connections)
    .set({ lastTestedAt: new Date(), lastServerVersion: serverVersion })
    .where(eq(connections.id, id));
}

export async function deleteConnection(id: string): Promise<void> {
  await ensureMigrated();
  await getDb().delete(connections).where(eq(connections.id, id));
}
