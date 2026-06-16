import type { Engine } from "@/lib/types";

export interface EngineInfo {
  key: Engine;
  label: string;
  /** Default TCP port (0 for file-based engines like SQLite). */
  defaultPort: number;
  /** Whether snapshot/restore is implemented for this engine yet. */
  supported: boolean;
}

// The 10 most-used database engines. MySQL + MariaDB share the existing
// mysqldump/mysql tooling and are supported now; the rest are selectable and
// will be implemented next (the connection is gated until then).
export const ENGINES: EngineInfo[] = [
  { key: "mysql", label: "MySQL", defaultPort: 3306, supported: true },
  { key: "mariadb", label: "MariaDB", defaultPort: 3306, supported: true },
  { key: "postgresql", label: "PostgreSQL", defaultPort: 5432, supported: true },
  { key: "mongodb", label: "MongoDB", defaultPort: 27017, supported: false },
  { key: "sqlserver", label: "Microsoft SQL Server", defaultPort: 1433, supported: false },
  { key: "oracle", label: "Oracle Database", defaultPort: 1521, supported: false },
  { key: "sqlite", label: "SQLite", defaultPort: 0, supported: false },
  { key: "redis", label: "Redis", defaultPort: 6379, supported: false },
  { key: "elasticsearch", label: "Elasticsearch", defaultPort: 9200, supported: false },
  { key: "db2", label: "IBM Db2", defaultPort: 50000, supported: false },
];

export const DEFAULT_ENGINE: Engine = "mysql";

const BY_KEY = new Map(ENGINES.map((e) => [e.key, e]));

export function getEngineInfo(key: Engine): EngineInfo {
  return BY_KEY.get(key) ?? ENGINES[0];
}

export function engineLabel(key: Engine): string {
  return getEngineInfo(key).label;
}

export function isEngineSupported(key: Engine): boolean {
  return getEngineInfo(key).supported;
}
