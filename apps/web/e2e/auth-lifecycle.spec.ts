import { expect, test } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:4000";

test("browser auth uses HttpOnly JWT cookies, rotates refresh, and logs out", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/auth/login");
  await page.locator("#identifier").fill("john.doe@acmecorp.com");
  await page.locator('input[type="password"]').fill("Chatter!Demo1");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/app/chats");

  const first = await context.cookies();
  const access = first.find((cookie) => cookie.name === "chatter_access");
  const refresh = first.find((cookie) => cookie.name === "chatter_refresh");
  const csrf = first.find((cookie) => cookie.name === "chatter_csrf");
  expect(access?.httpOnly).toBe(true);
  expect(refresh?.httpOnly).toBe(true);
  expect(refresh?.path).toBe("/api/v1/auth");
  expect(csrf?.httpOnly).toBe(false);

  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storage.local.filter((key) => /access|refresh|jwt|token/i.test(key))).toEqual([]);
  expect(storage.session.filter((key) => /access|refresh|jwt|token/i.test(key))).toEqual([]);

  const refreshStatus = await page.evaluate(async (api) => {
    const csrfValue = /(?:^|;\s*)chatter_csrf=([^;]+)/.exec(document.cookie)?.[1] ?? "";
    return fetch(`${api}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrfValue },
    }).then((response) => response.status);
  }, API);
  expect(refreshStatus).toBe(200);
  const secondRefresh = (await context.cookies()).find((cookie) => cookie.name === "chatter_refresh");
  expect(secondRefresh?.value).not.toBe(refresh?.value);

  const logoutStatus = await page.evaluate(async (api) => {
    const csrfValue = /(?:^|;\s*)chatter_csrf=([^;]+)/.exec(document.cookie)?.[1] ?? "";
    return fetch(`${api}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrfValue },
    }).then((response) => response.status);
  }, API);
  expect(logoutStatus).toBe(200);
  expect((await context.cookies()).find((cookie) => cookie.name === "chatter_refresh")).toBeUndefined();
  await context.close();
});
