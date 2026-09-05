import { describe, expect, it } from "vitest";
import { normalizeMobile } from "./identity";

/**
 * The lookup endpoint compares an indexed exact match, so everything depends on
 * every accepted spelling of a number collapsing to one canonical string.
 */
describe("phone lookup normalization", () => {
  it("collapses every accepted Indian spelling to one E.164 value", () => {
    for (const input of [
      "9876543210",
      "98765 43210",
      "98765-43210",
      "098765 43210",
      "+91 98765 43210",
      "+919876543210",
      "919876543210",
      "  +91 (98765) 43210  ",
    ]) {
      expect(normalizeMobile(input, "IN")).toBe("+919876543210");
    }
  });

  it("rejects numbers that cannot be dialled", () => {
    for (const bad of ["", "   ", "abcdefghij", "12345", "1234567890", "98765432101234567"]) {
      expect(normalizeMobile(bad, "IN")).toBeNull();
    }
  });

  it("rejects an explicit country code that contradicts the selection", () => {
    expect(normalizeMobile("+1 555 000 1111", "IN")).toBeNull();
    expect(normalizeMobile("+91 98765 43210", "US")).toBeNull();
  });

  it("normalizes other supported countries", () => {
    expect(normalizeMobile("555 000 1111", "US")).toBe("+15550001111");
    expect(normalizeMobile("+1 (555) 000-1111", "US")).toBe("+15550001111");
  });

  it("rejects an unknown country outright", () => {
    expect(normalizeMobile("9876543210", "ZZ")).toBeNull();
  });

  it("never returns a value containing formatting characters", () => {
    const out = normalizeMobile("+91 (98765) 43210", "IN");
    expect(out).toMatch(/^\+[0-9]+$/);
  });
});
