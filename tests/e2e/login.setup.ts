import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const AUTH_FILE = path.resolve(__dirname, "../.auth/state.json");

setup("authenticate", async ({ page }) => {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.goto("/login");
  // When the gate is off, /login redirects to /dashboard — nothing to sign in.
  if (new URL(page.url()).pathname.startsWith("/login")) {
    await page
      .getByLabel(/password|비밀번호/i)
      .fill(process.env.DBBS_PASSWORD || "test-pass-123");
    await page.getByRole("button", { name: /sign in|로그인/i }).click();
    await page.waitForURL(/\/dashboard/);
  }
  await page.context().storageState({ path: AUTH_FILE });
});
