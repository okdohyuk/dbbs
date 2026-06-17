"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createConnection,
  updateConnection,
  deleteConnection,
  markConnectionTested,
  getConnection,
  connectionNameExists,
} from "@/lib/server/store/repos/connections";
import { getT } from "@/lib/i18n/server";
import { getAdapter } from "@/lib/server/db/adapter";
import { loadConnectionConfig } from "@/lib/server/db/connection-config";
import { toConnectionPublic } from "@/lib/dto";
import { ok, fail, zodFieldErrors, type ActionResult } from "@/lib/actions/result";
import { ENGINES, isEngineSupported, engineLabel } from "@/lib/engines";
import type { ConnectionPublic, ConnectionTestResult, Engine, TableInfo } from "@/lib/types";

const engineEnum = z.enum(ENGINES.map((e) => e.key) as [Engine, ...Engine[]]);

const baseSchema = z.object({
  projectId: z.string().uuid("Pick a project"),
  name: z.string().trim().min(1, "Name is required").max(120),
  engine: engineEnum,
  host: z.string().trim().min(1, "Host is required").max(255),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1, "User is required").max(120),
  defaultDatabase: z.string().trim().max(120).optional().or(z.literal("")),
});

const createSchema = baseSchema.extend({
  password: z.string().min(1, "Password is required").max(512),
});

const rawTestSchema = z.object({
  engine: engineEnum,
  host: z.string().trim().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1),
  password: z.string().max(512),
  database: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function createConnectionAction(input: {
  projectId: string;
  name: string;
  engine: Engine;
  host: string;
  port: number | string;
  user: string;
  password: string;
  defaultDatabase?: string;
}): Promise<ActionResult<ConnectionPublic>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));
  if (!isEngineSupported(parsed.data.engine)) {
    return fail(`${engineLabel(parsed.data.engine)} is not supported yet`);
  }
  if (await connectionNameExists(parsed.data.projectId, parsed.data.name)) {
    const t = await getT();
    return fail(t("connectionForm.duplicateName", { name: parsed.data.name }), {
      name: t("connectionForm.duplicateName", { name: parsed.data.name }),
    });
  }
  try {
    const conn = await createConnection({
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      engine: parsed.data.engine,
      host: parsed.data.host,
      port: parsed.data.port,
      user: parsed.data.user,
      password: parsed.data.password,
      defaultDatabase: parsed.data.defaultDatabase || null,
    });
    revalidatePath("/connections");
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return ok(toConnectionPublic(conn));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create connection");
  }
}

export async function updateConnectionAction(
  id: string,
  input: {
    name: string;
    host: string;
    port: number | string;
    user: string;
    password?: string;
    defaultDatabase?: string;
  },
): Promise<ActionResult<ConnectionPublic>> {
  // engine is not editable after creation, so it is omitted here.
  const parsed = baseSchema.omit({ projectId: true, engine: true }).safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));

  const existing = await getConnection(id);
  if (!existing) return fail("Connection not found");
  if (await connectionNameExists(existing.projectId, parsed.data.name, id)) {
    const t = await getT();
    return fail(t("connectionForm.duplicateName", { name: parsed.data.name }), {
      name: t("connectionForm.duplicateName", { name: parsed.data.name }),
    });
  }

  try {
    const conn = await updateConnection(id, {
      name: parsed.data.name,
      host: parsed.data.host,
      port: parsed.data.port,
      user: parsed.data.user,
      password: input.password || undefined,
      defaultDatabase: parsed.data.defaultDatabase || null,
    });
    if (!conn) return fail("Connection not found");
    revalidatePath("/connections");
    revalidatePath(`/connections/${id}`);
    return ok(toConnectionPublic(conn));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update connection");
  }
}

export async function deleteConnectionAction(id: string): Promise<ActionResult> {
  try {
    await deleteConnection(id);
    revalidatePath("/connections");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete connection");
  }
}

/** Test arbitrary credentials entered in the form (before saving). */
export async function testConnectionAction(input: {
  engine: Engine;
  host: string;
  port: number | string;
  user: string;
  password: string;
  database?: string;
}): Promise<ConnectionTestResult> {
  const parsed = rawTestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid connection details" };
  try {
    const adapter = getAdapter(parsed.data.engine);
    return await adapter.testConnection({
      host: parsed.data.host,
      port: parsed.data.port,
      user: parsed.data.user,
      password: parsed.data.password,
      database: parsed.data.database || undefined,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Engine not supported" };
  }
}

/** Test an already-saved connection and record the result. */
export async function testSavedConnectionAction(
  id: string,
): Promise<ConnectionTestResult> {
  const loaded = await loadConnectionConfig(id);
  if (!loaded) return { ok: false, error: "Connection not found" };
  const adapter = getAdapter(loaded.conn.engine);
  const result = await adapter.testConnection(loaded.cfg);
  await markConnectionTested(id, result.serverVersion ?? null);
  revalidatePath("/connections");
  revalidatePath(`/connections/${id}`);
  return result;
}

export async function listDatabasesAction(
  connectionId: string,
): Promise<ActionResult<string[]>> {
  const loaded = await loadConnectionConfig(connectionId);
  if (!loaded) return fail("Connection not found");
  try {
    const adapter = getAdapter(loaded.conn.engine);
    return ok(await adapter.listDatabases(loaded.cfg));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list databases");
  }
}

export async function listTablesAction(
  connectionId: string,
  database: string,
): Promise<ActionResult<TableInfo[]>> {
  const loaded = await loadConnectionConfig(connectionId, database);
  if (!loaded) return fail("Connection not found");
  try {
    const adapter = getAdapter(loaded.conn.engine);
    return ok(await adapter.listTables(loaded.cfg, database));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list tables");
  }
}

/** List databases for credentials entered in the form (before saving). */
export async function listDatabasesForCredentialsAction(input: {
  engine: Engine;
  host: string;
  port: number | string;
  user: string;
  password: string;
}): Promise<ActionResult<string[]>> {
  const parsed = rawTestSchema.omit({ database: true }).safeParse(input);
  if (!parsed.success) return fail("Invalid connection details");
  try {
    const adapter = getAdapter(parsed.data.engine);
    return ok(
      await adapter.listDatabases({
        host: parsed.data.host,
        port: parsed.data.port,
        user: parsed.data.user,
        password: parsed.data.password,
      }),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list databases");
  }
}

export async function getConnectionPublicAction(
  id: string,
): Promise<ConnectionPublic | null> {
  const conn = await getConnection(id);
  return conn ? toConnectionPublic(conn) : null;
}
