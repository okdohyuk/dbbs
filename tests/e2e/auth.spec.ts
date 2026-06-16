import { test, expect } from "@playwright/test";

const PASSWORD = process.env.DBBS_PASSWORD || "";

test.describe("password gate", () => {
  // Only meaningful when the gate is enabled.
  test.beforeEach(() => {
    test.skip(!PASSWORD, "auth gate disabled (DBBS_PASSWORD not set)");
  });
  // Run these unauthenticated (ignore the saved session).
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated request is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password|비밀번호/i).fill("definitely-wrong-pass");
    await page.getByRole("button", { name: /sign in|로그인/i }).click();
    await expect(page.getByText(/wrong password|올바르지 않습니다/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("correct password grants access", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password|비밀번호/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|로그인/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
