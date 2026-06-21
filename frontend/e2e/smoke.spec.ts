import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads successfully with all sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SupportPilot AI/);

    // Hero section
    await expect(page.getByText("AI support that")).toBeVisible();
    await expect(page.getByText("scales with your team")).toBeVisible();

    // CTA buttons
    await expect(page.getByText("Start Free Trial")).toBeVisible();
    await expect(page.getByText("Learn More")).toBeVisible();

    // Features section
    await expect(page.getByText("Knowledge Base")).toBeVisible();
    await expect(page.getByText("AI Chat")).toBeVisible();
    await expect(page.getByText("Analytics")).toBeVisible();

    // Pricing section
    await expect(page.getByText("Simple, transparent pricing")).toBeVisible();
    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();

    // Footer
    await expect(page.getByText("Terms")).toBeVisible();
    await expect(page.getByText("Privacy")).toBeVisible();
  });

  test("mobile navigation works", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hamburger should be visible on mobile
    const hamburger = page.getByLabel("Open menu");
    await expect(hamburger).toBeVisible();

    // Desktop nav should be hidden
    await expect(page.getByText("Features").first()).not.toBeVisible();

    // Open mobile menu
    await hamburger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Nav links should be visible
    await expect(page.getByText("Features").first()).toBeVisible();

    // Close menu
    await page.getByLabel("Close menu").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe("Authentication Flow", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText("Create your account")).toBeVisible();
  });

  test("navigation between sign-in and sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByText("Create one free").click();
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Responsive Layouts", () => {
  const viewports = [
    { name: "iPhone SE", width: 375, height: 667 },
    { name: "iPhone 14", width: 390, height: 844 },
    { name: "iPad Air", width: 820, height: 1180 },
    { name: "Desktop", width: 1280, height: 800 },
    { name: "Large Desktop", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`landing page renders at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // Hero heading visible
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // CTA buttons visible and clickable
      const cta = page.getByText("Start Free Trial");
      await expect(cta).toBeVisible();
    });
  }
});

test.describe("API Health", () => {
  test("backend health endpoint responds", async ({ request }) => {
    const response = await request.get("http://localhost:8000/api/v1/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("healthy");
  });
});
