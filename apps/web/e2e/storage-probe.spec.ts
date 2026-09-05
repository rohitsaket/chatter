import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });
test("PART 10 — locate private crypto state", async ({ page }) => {
  await page.goto("/crypto-spike");
  await expect(page.getByTestId("spike-ready")).toHaveAttribute("data-ready", "1", { timeout: 60_000 });
  await page.evaluate(async () => {
    const s = (window as any).__spike;
    s.party = await s.init("probe", "spike-probe");
    await s.harness.publishKeys(s.party);
  });
  const report = await page.evaluate(async () => {
    const dbs = await (indexedDB as any).databases();
    return {
      idb: dbs.map((d: any) => d.name),
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
      cookies: document.cookie,
    };
  });
  console.log("STORAGE " + JSON.stringify(report));
  expect(report.localStorageKeys).toHaveLength(0);
});
