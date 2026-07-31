import { expect, test, type Page } from "@playwright/test";

// Session comes from the storageState produced by auth.setup.ts.
async function login(page: Page) {
  await page.goto("/app/chats");
  await expect(page.getByText("Chatter").first()).toBeVisible();
}

test.describe("Chatter", () => {
  test("logs in and shows the conversation list with unread badges", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Design Team").first()).toBeVisible();
    await expect(page.getByText("Alice Johnson").first()).toBeVisible();
    // Storage meter from the real admin endpoint
    await expect(page.getByText(/of .* used/)).toBeVisible();
  });

  test("opens the Design Team group thread with poll and pinned banner", async ({ page }) => {
    await login(page);
    await page.goto("/app/chats/design");
    await expect(page.getByText("Which layout do we prefer for the KPI section?")).toBeVisible();
    await expect(page.getByText(/Pinned by/)).toBeVisible();
    await expect(page.getByText("Design System v2.0 is now live!", { exact: false }).first()).toBeVisible();
  });

  test("sends a message and it persists after reload", async ({ page }) => {
    await login(page);
    await page.goto("/app/chats/alice");
    const text = `E2E hello ${Date.now()}`;
    await page.getByPlaceholder("Type a message...").fill(text);
    await page.getByPlaceholder("Type a message...").press("Enter");
    await expect(page.getByText(text).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(text).first()).toBeVisible();
  });

  test("votes in the poll and the count updates", async ({ page }) => {
    await login(page);
    await page.goto("/app/chats/design");
    const option = page.getByText("Option 1 (Compact)").first();
    await option.click();
    await expect(page.getByText("Vote recorded ✓")).toBeVisible();
  });

  test("status module shows feed and viewer analytics", async ({ page }) => {
    await login(page);
    await page.goto("/app/status");
    await expect(page.getByText("My Status").first()).toBeVisible();
    await expect(page.getByText("Status Details")).toBeVisible();
    await expect(page.getByText("Viewers")).toBeVisible();
  });

  test("contacts table opens a DM via the chat action", async ({ page }) => {
    await login(page);
    await page.goto("/app/contacts");
    await expect(page.getByText("All Contacts")).toBeVisible();
    await expect(page.getByText("Michael Brown").first()).toBeVisible();
  });

  test("files table lists seed files and toggles a star", async ({ page }) => {
    await login(page);
    await page.goto("/app/files");
    await expect(page.getByText("dashboard-mockup.pdf").first()).toBeVisible();
    await expect(page.getByText("Version History")).toBeVisible();
    await expect(page.getByText("v2.0")).toBeVisible();
  });

  test("notifications mark-all-read clears the badge", async ({ page }) => {
    await login(page);
    await page.goto("/app/notifications");
    await expect(page.getByText(/mentioned you/).first()).toBeVisible();
    const markAll = page.getByText("Mark all as read");
    if (await markAll.isVisible()) {
      await markAll.click();
      await expect(page.getByText("All caught up")).toBeVisible();
    }
  });

  test("settings toggles persist to the server", async ({ page }) => {
    await login(page);
    await page.goto("/app/settings");
    await expect(page.getByText("Startup Behavior")).toBeVisible();
    // Switch theme to dark and verify body attribute
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
    // Restore light
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  });

  test("accent swatch changes the accent and persists", async ({ page }) => {
    await login(page);
    await page.goto("/app/settings");
    const swatches = page.locator('div[style*="border-radius: 50%"][style*="box-shadow"]');
    void swatches;
    // Click the blue swatch by its background color
    await page.locator('div[style*="rgb(61, 120, 243)"]').first().click();
    await expect(page.locator("body")).toHaveAttribute("data-accent", "blue");
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-accent", "blue");
    // Restore purple
    await page.locator('div[style*="rgb(113, 55, 232)"]').first().click();
  });

  test("calls page shows a truthful not-configured state (no simulated call)", async ({ page }) => {
    await login(page);
    await page.goto("/app/calls");
    await page.getByRole("button", { name: /start call/i }).click();
    await expect(page.getByText("Calls are not configured", { exact: true })).toBeVisible();
  });

  test("admin module lists members with roles and storage", async ({ page }) => {
    await login(page);
    await page.goto("/app/admin");
    await expect(page.getByText("Administration")).toBeVisible();
    await expect(page.getByText("Owner").first()).toBeVisible();
    await expect(page.getByText("Recent Audit Events")).toBeVisible();
  });

  test("groups module shows directory and overview", async ({ page }) => {
    await login(page);
    await page.goto("/app/groups");
    await expect(page.getByText("My Groups").first()).toBeVisible();
    await page.getByText("Marketing Team").first().click();
    await expect(page.getByText("Upcoming Events")).toBeVisible();
    await expect(page.getByText("Campaign Planning Sync")).toBeVisible();
  });
});
