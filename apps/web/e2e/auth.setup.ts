import { expect, test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill("john.doe@acmecorp.com");
  await page.locator('input[type="password"]').fill("Chatter!Demo1");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/app/chats");
  await expect(page.getByText("Chatter").first()).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
