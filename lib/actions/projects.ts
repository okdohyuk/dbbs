"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/server/store/repos/projects";
import { ok, fail, zodFieldErrors, type ActionResult } from "@/lib/actions/result";
import type { Project } from "@/lib/types";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createProjectAction(input: {
  name: string;
  description?: string;
}): Promise<ActionResult<Project>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));
  try {
    const project = await createProject({
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return ok(project);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create project");
  }
}

export async function updateProjectAction(
  id: string,
  input: { name: string; description?: string },
): Promise<ActionResult<Project>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));
  try {
    const project = await updateProject(id, {
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
    if (!project) return fail("Project not found");
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return ok(project);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update project");
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    await deleteProject(id);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete project");
  }
}
