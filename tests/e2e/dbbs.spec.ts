import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

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

test("11) language switch to Korean and back updates the UI", async ({ page }) => {
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
