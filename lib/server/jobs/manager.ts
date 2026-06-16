import "server-only";
import type { ProgressEvent, JobStatus } from "@/lib/types";

export type JobKind = "snapshot" | "restore";

/** Event shape sent over SSE to the browser. */
export interface JobWireEvent {
  type: ProgressEvent["type"] | "final";
  bytesWritten?: number;
  message?: string;
  status?: JobStatus;
  error?: string;
}

type Subscriber = (event: JobWireEvent) => void;

interface JobState {
  id: string;
  kind: JobKind;
  status: JobStatus;
  bytes: number;
  buffer: JobWireEvent[];
  subscribers: Set<Subscriber>;
  controller: AbortController;
  done: boolean;
}

const g = globalThis as unknown as { __dbbsJobs?: Map<string, JobState> };

function jobs(): Map<string, JobState> {
  if (!g.__dbbsJobs) g.__dbbsJobs = new Map();
  return g.__dbbsJobs;
}

export function createJob(id: string, kind: JobKind): AbortSignal {
  const state: JobState = {
    id,
    kind,
    status: "running",
    bytes: 0,
    buffer: [],
    subscribers: new Set(),
    controller: new AbortController(),
    done: false,
  };
  jobs().set(id, state);
  return state.controller.signal;
}

export function emit(id: string, event: ProgressEvent): void {
  const state = jobs().get(id);
  if (!state) return;
  if (event.bytesWritten != null) state.bytes = event.bytesWritten;
  const wire: JobWireEvent = {
    type: event.type,
    bytesWritten: event.bytesWritten,
    message: event.message,
  };
  state.buffer.push(wire);
  if (state.buffer.length > 300) state.buffer.shift();
  for (const sub of state.subscribers) sub(wire);
}

export function finishJob(id: string, status: JobStatus, error?: string): void {
  const state = jobs().get(id);
  if (!state) return;
  state.status = status;
  state.done = true;
  const wire: JobWireEvent = {
    type: "final",
    status,
    error,
    bytesWritten: state.bytes,
  };
  state.buffer.push(wire);
  for (const sub of state.subscribers) sub(wire);
  // Keep terminal state briefly so late subscribers still see the result.
  setTimeout(() => jobs().delete(id), 60_000);
}

export function abortJob(id: string): boolean {
  const state = jobs().get(id);
  if (!state || state.done) return false;
  state.controller.abort();
  return true;
}

/** Subscribe to a job, receiving buffered events first. Null if unknown. */
export function subscribe(
  id: string,
  cb: Subscriber,
): { replay: JobWireEvent[]; unsubscribe: () => void } | null {
  const state = jobs().get(id);
  if (!state) return null;
  state.subscribers.add(cb);
  return {
    replay: [...state.buffer],
    unsubscribe: () => state.subscribers.delete(cb),
  };
}
