import { describe, expect, it } from "vitest";
import { emailSchema, passwordSchema, cursorQuerySchema, parseOrBadRequest, boundedText } from "./index";

describe("emailSchema", () => {
  it("normalizes case and whitespace", () => {
    expect(emailSchema.parse("  John.Doe@AcmeCorp.com ")).toBe("john.doe@acmecorp.com");
  });
  it("rejects invalid emails", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
  });
});

describe("passwordSchema", () => {
  it("accepts a compliant password", () => {
    expect(passwordSchema.parse("Chatter!Demo1")).toBe("Chatter!Demo1");
  });
  it("rejects short or letter-only passwords", () => {
    expect(() => passwordSchema.parse("short1")).toThrow();
    expect(() => passwordSchema.parse("onlyletterslong")).toThrow();
  });
});

describe("cursorQuerySchema", () => {
  it("defaults limit and caps it at 100", () => {
    expect(cursorQuerySchema.parse({}).limit).toBe(30);
    expect(() => cursorQuerySchema.parse({ limit: "500" })).toThrow();
  });
});

describe("parseOrBadRequest", () => {
  it("throws a 400-tagged error with joined issue details", () => {
    try {
      parseOrBadRequest(boundedText(5), "");
      expect.unreachable();
    } catch (e) {
      expect((e as { statusCode: number }).statusCode).toBe(400);
    }
  });
});
