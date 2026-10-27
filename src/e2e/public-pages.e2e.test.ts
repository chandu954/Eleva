import { expect, test } from "@playwright/test";

/**
 * Public-surface smoke tests.
 *
 * These run against a real `next dev` server (see playwright.config.ts) but
 * stay offline: Supabase points at a closed local port and the mock AI
 * provider is forced on, so no credentials or network services are required.
 */

test.describe("public pages", () => {
  test("root redirects to the Eleva landing page", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/eleva$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Your job search/i }),
    ).toBeVisible();
  });

  test("landing page exposes the primary calls to action", async ({ page }) => {
    await page.goto("/eleva");

    await expect(page.getByRole("link", { name: /Enter workspace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/\/eleva\/auth\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  });

  test("protected workspace redirects signed-out visitors to login", async ({ page }) => {
    await page.goto("/eleva/dashboard");

    await expect(page).toHaveURL(/\/eleva\/auth\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/eleva/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("login page links to signup", async ({ page }) => {
    await page.goto("/eleva/auth/login");

    await page.getByRole("link", { name: /Create an account/i }).click();
    await expect(page).toHaveURL(/\/eleva\/auth\/signup/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});
