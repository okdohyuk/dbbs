import { defineConfig } from "drizzle-kit";

// Dev-time config for `drizzle-kit generate`. Runtime migrations are applied
// programmatically by the app (lib/server/store/migrate.ts).
export default defineConfig({
  schema: "./lib/server/store/schema.ts",
  out: "./lib/server/store/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://dbbs:dbbs@localhost:5432/dbbs",
  },
  strict: true,
  verbose: true,
});
