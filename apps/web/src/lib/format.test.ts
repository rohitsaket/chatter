import { describe, expect, it } from "vitest";
import { formatBytes, listTime, relativeTime } from "./format";

describe("formatBytes", () => {
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(2_400_000)).toBe("2.3 MB");
    expect(formatBytes(2.45 * 1024 ** 3)).toBe("2.45 GB");
  });
});

describe("listTime", () => {
  it("renders today's timestamps as clock time", () => {
    const now = new Date();
    expect(listTime(now.toISOString())).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });
  it("renders yesterday as Yesterday", () => {
    const y = new Date(Date.now() - 24 * 3600_000);
    expect(listTime(y.toISOString())).toBe("Yesterday");
  });
});

describe("relativeTime", () => {
  it("renders minutes and hours", () => {
    expect(relativeTime(new Date(Date.now() - 30_000).toISOString())).toBe("Just now");
    expect(relativeTime(new Date(Date.now() - 8 * 60_000).toISOString())).toBe("8m ago");
    expect(relativeTime(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe("3h ago");
  });
});
