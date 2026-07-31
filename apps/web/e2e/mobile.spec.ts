import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/app/chats");
  await expect(page.getByRole("button", { name: /status/i })).toBeVisible();
}

test.describe("Mobile shell (<760px)", () => {
  test("shows single-panel chat list with bottom navigation", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Chats", { exact: true }).first()).toBeVisible();
    // Bottom nav items
    await expect(page.getByRole("button", { name: /status/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /groups/i })).toBeVisible();
  });

  test("opens a thread and returns with the back button", async ({ page }) => {
    await login(page);
    await page.getByText("Alice Johnson").first().click();
    await page.waitForURL("**/app/chats/alice");
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
    await page.getByRole("button", { name: "‹" }).click();
    await page.waitForURL("**/app/chats");
  });
});
