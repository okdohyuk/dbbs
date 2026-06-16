import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/server/store/client";
import { ensureMigrated } from "@/lib/server/store/migrate";
import { projects } from "@/lib/server/store/schema";
import type { Project } from "@/lib/types";

export async function listProjects(): Promise<Project[]> {
  await ensureMigrated();
  return getDb().select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(id: string): Promise<Project | null> {
  await ensureMigrated();
  const rows = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: {
  name: string;
  description?: string | null;
}): Promise<Project> {
  await ensureMigrated();
  const rows = await getDb()
    .insert(projects)
    .values({ name: input.name, description: input.description ?? null })
    .returning();
  return rows[0];
}

export async function updateProject(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<Project | null> {
  await ensureMigrated();
  const rows = await getDb()
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  await ensureMigrated();
  await getDb().delete(projects).where(eq(projects.id, id));
}
