import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";

const SNAPSHOT_DIR = path.resolve(__dirname, "../../snapshots");

// Shared state across the serial flow.
const ids: { projectId?: string; connA?: string; connB?: string } = {};

/** Pick an option from a Base UI <Select> by clicking the trigger then option. */
async function selectOption(page: Page, triggerTestId: string, optionText: string) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name: optionText, exact: false }).first().click();
}

function idFromUrl(url: string, segment: string): string {
  const m = url.match(new RegExp(`/${segment}/([0-9a-f-]{36})`));
  if (!m) throw new Error(`No ${segment} id in ${url}`);
  return m[1];
}

function readNewestDump(): string {
  const files = readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.gz"))
    .map((f) => path.join(SNAPSHOT_DIR, f));
  if (files.length === 0) throw new Error("no dump files found");
  const newest = files
    .map((f) => ({ f, m: statSync(f).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0].f;
  const buf = readFileSync(newest);
  return newest.endsWith(".gz") ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

test.describe.configure({ mode: "serial" });

test("1) create a project", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Name").fill("E2E Project");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText("E2E Project").first()).toBeVisible();

  await page.getByRole("link", { name: "E2E Project" }).first().click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  ids.projectId = idFromUrl(page.url(), "projects");
});

test("2) add connection A (mysql-a) and test it", async ({ page }) => {
  await page.goto(`/connections/new?projectId=${ids.projectId}`);
  await page.getByLabel("Connection name").fill("Conn A");
  await page.getByLabel("Host").fill("mysql-a");
  await page.getByLabel("Port").fill("3306");
  await page.getByLabel("User").fill("root");
  await page.getByLabel("Password", { exact: false }).fill("root");
  await page.getByLabel("Default database").fill("test");

  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByTestId("test-result")).toContainText("Connected", { timeout: 30_000 });

  await page.getByRole("button", { name: "Create connection" }).click();
  await page.waitForURL(/\/connections\/[0-9a-f-]{36}/);
  ids.connA = idFromUrl(page.url(), "connections");
});

test("3) add connection B (mysql-b) and test it", async ({ page }) => {
  await page.goto(`/connections/new?projectId=${ids.projectId}`);
  await page.getByLabel("Connection name").fill("Conn B");
  await page.getByLabel("Host").fill("mysql-b");
  await page.getByLabel("Port").fill("3306");
  await page.getByLabel("User").fill("root");
  await page.getByLabel("Password", { exact: false }).fill("root");

  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByTestId("test-result")).toContainText("Connected", { timeout: 30_000 });

  await page.getByRole("button", { name: "Create connection" }).click();
  await page.waitForURL(/\/connections\/[0-9a-f-]{36}/);
  ids.connB = idFromUrl(page.url(), "connections");
});

test("4) browse tables on connection A", async ({ page }) => {
  await page.goto(`/tables/${ids.connA}`);
  await expect(page.getByText("customers")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("orders")).toBeVisible();
});

test("5) create a snapshot of A.test", async ({ page }) => {
  await page.goto(`/snapshots/new?connectionId=${ids.connA}&database=test`);
  await expect(page.getByLabel("Snapshot name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Snapshot name").fill("full snap");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
});

test("6) dump file contains schema, data, and routines", async () => {
  const sql = readNewestDump();
  expect(sql).toContain("CREATE TABLE");
  expect(sql).toContain("customers");
  expect(sql).toContain("Ada Lovelace"); // actual row data
  expect(sql.toUpperCase()).toContain("PROCEDURE");
});

test("7) restore the snapshot into B (different server, new database)", async ({ page }) => {
  await page.goto("/restore");
  // snapshot select defaults to our snapshot; pick target connection B explicitly.
  await selectOption(page, "restore-target", "Conn B");
  const dbInput = page.getByLabel("Target database");
  await dbInput.fill("restored_db");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
});

test("8) restored tables are present on B.restored_db", async ({ page }) => {
  await page.goto(`/tables/${ids.connB}?database=restored_db`);
  await expect(page.getByText("customers")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("orders")).toBeVisible();
});

test("9) schema-only snapshot omits row data", async ({ page }) => {
  await page.goto(`/snapshots/new?connectionId=${ids.connA}&database=test`);
  await page.getByLabel("Snapshot name").fill("schema only snap");
  await page.getByRole("tab", { name: "Schema only" }).click();
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
  const sql = readNewestDump();
  expect(sql).toContain("CREATE TABLE");
  expect(sql).not.toContain("Ada Lovelace"); // no row data in schema-only
});

test("10) data-only snapshot omits schema", async ({ page }) => {
  await page.goto(`/snapshots/new?connectionId=${ids.connA}&database=test`);
  await page.getByLabel("Snapshot name").fill("data only snap");
  await page.getByRole("tab", { name: "Data only" }).click();
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
  const sql = readNewestDump();
  expect(sql).toContain("Ada Lovelace"); // row data present
  expect(sql).not.toContain("CREATE TABLE");
});

test("12) upload a .sql file as a snapshot", async ({ page }) => {
  await page.goto("/snapshots/new");
  await page.getByRole("tab", { name: /Upload \.sql file/i }).click();
  await page.getByLabel("Database name").fill("uploaded_db");
  await page.getByLabel("Snapshot name").fill("uploaded snap");
  const sql =
    "CREATE TABLE IF NOT EXISTS uploaded_table (id INT PRIMARY KEY, label VARCHAR(50));\n" +
    "INSERT INTO uploaded_table (id, label) VALUES (1,'hello'),(2,'world');\n";
  await page.getByTestId("upload-file-input").setInputFiles({
    name: "mydump.sql",
    mimeType: "application/sql",
    buffer: Buffer.from(sql),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await page.waitForURL(/\/snapshots$/);
  await expect(page.getByText("uploaded snap")).toBeVisible();
  await expect(page.getByText("Uploaded").first()).toBeVisible();
});

test("13) restore the uploaded snapshot into B", async ({ page }) => {
  await page.goto("/restore");
  await selectOption(page, "restore-snapshot", "uploaded snap");
  await selectOption(page, "restore-target", "Conn B");
  await page.getByLabel("Target database").fill("uploaded_restored");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
  await page.goto(`/tables/${ids.connB}?database=uploaded_restored`);
  await expect(page.getByText("uploaded_table")).toBeVisible({ timeout: 30_000 });
});

test("14) language switch to Korean and back updates the UI", async ({ page }) => {
  await page.goto("/settings");
  // Switch to Korean.
  await page.getByTestId("language-switcher").click();
  await page.getByRole("option", { name: "한국어" }).click();
  // Sidebar nav + page title localize.
  await expect(page.getByRole("link", { name: "개요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
  // Switch back to English.
  await page.getByTestId("language-switcher").click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("15) drag-and-drop selects a dump file", async ({ page }) => {
  await page.goto("/snapshots/new");
  await page.getByRole("tab", { name: /Upload \.sql file/i }).click();
  const dropzone = page.getByTestId("upload-dropzone");
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["CREATE TABLE x(id INT);"], "dropped.sql", { type: "application/sql" }));
    return dt;
  });
  await dropzone.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("dropped.sql")).toBeVisible();
});

test("16) MariaDB-syntax dump restores into MySQL with compatibility on", async ({ page }) => {
  // DEFAULT sysdate() is MariaDB-only and is rejected by MySQL 8 without the rewrite.
  await page.goto("/snapshots/new");
  await page.getByRole("tab", { name: /Upload \.sql file/i }).click();
  await page.getByLabel("Database name").fill("maria_db");
  await page.getByLabel("Snapshot name").fill("maria snap");
  const sql =
    "CREATE TABLE IF NOT EXISTS maria_test (\n" +
    "  id INT NOT NULL AUTO_INCREMENT,\n" +
    "  created datetime DEFAULT sysdate(),\n" +
    "  PRIMARY KEY (id)\n" +
    ") ENGINE=InnoDB;\n" +
    "INSERT INTO maria_test (id) VALUES (1);\n";
  await page.getByTestId("upload-file-input").setInputFiles({
    name: "maria.sql",
    mimeType: "application/sql",
    buffer: Buffer.from(sql),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await page.waitForURL(/\/snapshots$/);

  await page.goto("/restore");
  await selectOption(page, "restore-snapshot", "maria snap");
  await selectOption(page, "restore-target", "Conn B");
  await page.getByLabel("Target database").fill("maria_restored");
  // MariaDB compatibility checkbox is on by default.
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });
  await page.goto(`/tables/${ids.connB}?database=maria_restored`);
  await expect(page.getByText("maria_test")).toBeVisible({ timeout: 30_000 });
});

test("18) compat rewrite changes DDL only, never INSERT data", async ({ page }) => {
  await page.goto("/snapshots/new");
  await page.getByRole("tab", { name: /Upload \.sql file/i }).click();
  await page.getByLabel("Database name").fill("compat_db");
  await page.getByLabel("Snapshot name").fill("compat snap");
  const sql =
    "CREATE TABLE IF NOT EXISTS compat_test (\n" +
    "  id INT NOT NULL,\n" +
    "  note VARCHAR(120),\n" +
    "  created datetime DEFAULT sysdate(),\n" + // DDL: must be rewritten
    "  PRIMARY KEY (id)\n" +
    ") ENGINE=InnoDB;\n" +
    // data containing the literal phrase: must NOT be rewritten
    "INSERT INTO compat_test (id, note) VALUES (1, 'literal default sysdate() stays');\n";
  await page.getByTestId("upload-file-input").setInputFiles({
    name: "compat.sql",
    mimeType: "application/sql",
    buffer: Buffer.from(sql),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await page.waitForURL(/\/snapshots$/);

  await page.goto("/restore");
  await selectOption(page, "restore-snapshot", "compat snap");
  await selectOption(page, "restore-target", "Conn B");
  await page.getByLabel("Target database").fill("compat_restored");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.locator('[data-testid="job-progress"][data-phase="completed"]')).toBeVisible({
    timeout: 60_000,
  });

  // DDL rewrite succeeded (table exists) AND the INSERT value is byte-for-byte intact.
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3308,
    user: "root",
    password: "root",
    database: "compat_restored",
  });
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT note FROM compat_test WHERE id = 1",
  );
  await conn.end();
  expect(rows[0]?.note).toBe("literal default sysdate() stays");
});

test("17) connection form lists databases to pick from", async ({ page }) => {
  await page.goto("/connections/new");
  await page.getByLabel("Host").fill("mysql-a");
  await page.getByLabel("Port").fill("3306");
  await page.getByLabel("User").fill("root");
  await page.getByLabel("Password", { exact: false }).fill("root");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByTestId("test-result")).toContainText("Connected", { timeout: 30_000 });

  const picker = page.getByTestId("db-picker");
  await expect(picker).toBeVisible();
  await picker.getByRole("button", { name: "test", exact: true }).click();
  await expect(page.getByLabel("Default database")).toHaveValue("test");

  // Editing the host invalidates the stale "Connected" banner + db chips.
  await page.getByLabel("Host").fill("mysql-changed");
  await expect(page.getByTestId("db-picker")).toBeHidden();
  await expect(page.getByTestId("test-result")).toBeHidden();
});

test("19) engine selector: MariaDB works, unsupported engine is gated", async ({ page }) => {
  await page.goto("/connections/new");

  // Unsupported engine → coming-soon note + disabled actions.
  await selectOption(page, "engine-select", "PostgreSQL");
  await expect(page.getByTestId("engine-coming-soon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Test connection" })).toBeDisabled();

  // Supported engine → note gone, actions enabled.
  await selectOption(page, "engine-select", "MariaDB");
  await expect(page.getByTestId("engine-coming-soon")).toBeHidden();
  await expect(page.getByRole("button", { name: "Test connection" })).toBeEnabled();

  // A MariaDB-engine connection tests via the shared mysql tooling.
  await page.getByLabel("Host").fill("mysql-a");
  await page.getByLabel("Port").fill("3306");
  await page.getByLabel("User").fill("root");
  await page.getByLabel("Password", { exact: false }).fill("root");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByTestId("test-result")).toContainText("Connected", { timeout: 30_000 });
});
