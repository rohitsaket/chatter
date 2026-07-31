import { describe, expect, it } from "vitest";
import { containsPattern, escapeLike, toTsQuery } from "./index";

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
});

describe("containsPattern", () => {
  it("wraps trimmed input in wildcards", () => {
    expect(containsPattern("  alice ")).toBe("%alice%");
  });
});

describe("toTsQuery", () => {
  it("ANDs prefix-matched words and strips punctuation", () => {
    expect(toTsQuery("dashboard mock-up!")).toBe("dashboard:* & mock:* & up:*");
  });
  it("returns empty string for empty input", () => {
    expect(toTsQuery("  ")).toBe("");
  });
});
