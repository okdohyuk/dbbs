import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import type { SnapshotOptions, JobStatus, Engine } from "@/lib/types";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  engine: text("engine").$type<Engine>().notNull().default("mysql"),
  host: text("host").notNull(),
  port: integer("port").notNull().default(3306),
  user: text("user").notNull(),
  passwordEnc: text("password_enc").notNull(),
  defaultDatabase: text("default_database"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastServerVersion: text("last_server_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sourceConnectionId: uuid("source_connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  sourceDatabase: text("source_database").notNull(),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  bytes: bigint("bytes", { mode: "number" }).notNull().default(0),
  compressed: boolean("compressed").notNull().default(false),
  options: jsonb("options").$type<SnapshotOptions>().notNull(),
  status: text("status").$type<JobStatus>().notNull().default("running"),
  error: text("error"),
  serverVersion: text("server_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const restoreJobs = pgTable("restore_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => snapshots.id, { onDelete: "cascade" }),
  targetConnectionId: uuid("target_connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  targetDatabase: text("target_database").notNull(),
  status: text("status").$type<JobStatus>().notNull().default("running"),
  error: text("error"),
  logTail: text("log_tail"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type ProjectRow = typeof projects.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
export type SnapshotRow = typeof snapshots.$inferSelect;
export type RestoreJobRow = typeof restoreJobs.$inferSelect;
