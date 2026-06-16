import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "@/lib/server/config";

type Sql = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

// Cache on globalThis so Next.js HMR (dev) doesn't open a new pool per reload.
const g = globalThis as unknown as { __dbbsSql?: Sql; __dbbsDb?: Db };

export function getSql(): Sql {
  if (!g.__dbbsSql) {
    g.__dbbsSql = postgres(databaseUrl(), { max: 8, onnotice: () => {} });
  }
  return g.__dbbsSql;
}

export function getDb(): Db {
  if (!g.__dbbsDb) {
    g.__dbbsDb = drizzle(getSql(), { schema });
  }
  return g.__dbbsDb;
}
