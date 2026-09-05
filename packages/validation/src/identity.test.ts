import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  countryByCode,
  aadhaarDigitCount,
  aadhaarError,
  aadhaarProblem,
  formatAadhaar,
  isValidAadhaar,
  isValidPostalCode,
  maskAadhaar,
  normalizeAadhaar,
  normalizeMobile,
  personNameSchema,
  statesFor,
  verhoeffValid,
} from "./identity";

// Verhoeff-valid 12-digit sample (not an issued Aadhaar).
const VALID_AADHAAR = "234567890124";

describe("personNameSchema", () => {
  it("rejects empty and whitespace-only names", () => {
    expect(personNameSchema.safeParse("").success).toBe(false);
    expect(personNameSchema.safeParse("       ").success).toBe(false);
  });

  it("trims and accepts ordinary names", () => {
    expect(personNameSchema.parse("  Rohit  ")).toBe("Rohit");
  });

  it("accepts legitimate non-ASCII and punctuated names", () => {
    for (const n of ["Zoë", "O'Brien", "Jean-Luc", "Ramírez", "आदित्य"]) {
      expect(personNameSchema.safeParse(n).success).toBe(true);
    }
  });

  it("rejects digits and over-long values", () => {
    expect(personNameSchema.safeParse("Robert123").success).toBe(false);
    expect(personNameSchema.safeParse("a".repeat(81)).success).toBe(false);
  });
});

describe("normalizeMobile", () => {
  it("normalizes Indian numbers to E.164 from several input shapes", () => {
    for (const input of ["9876543210", "098765 43210", "+91 98765-43210", "+919876543210"]) {
      expect(normalizeMobile(input, "IN")).toBe("+919876543210");
    }
  });

  it("rejects Indian numbers with an invalid leading digit or length", () => {
    expect(normalizeMobile("1234567890", "IN")).toBeNull();
    expect(normalizeMobile("98765", "IN")).toBeNull();
  });

  it("rejects a country code that contradicts the selected country", () => {
    expect(normalizeMobile("+14155552671", "IN")).toBeNull();
  });

  it("handles other countries", () => {
    expect(normalizeMobile("4155552671", "US")).toBe("+14155552671");
  });

  it("rejects unknown countries and non-numeric input", () => {
    expect(normalizeMobile("9876543210", "ZZ")).toBeNull();
    expect(normalizeMobile("not-a-number", "IN")).toBeNull();
  });
});

describe("isValidPostalCode", () => {
  it("validates Indian PIN codes", () => {
    expect(isValidPostalCode("380001", "IN")).toBe(true);
    expect(isValidPostalCode("038001", "IN")).toBe(false); // may not start with 0
    expect(isValidPostalCode("38001", "IN")).toBe(false);
    expect(isValidPostalCode("3800011", "IN")).toBe(false);
  });

  it("is country-aware", () => {
    expect(isValidPostalCode("94107", "US")).toBe(true);
    expect(isValidPostalCode("94107", "IN")).toBe(false);
    // Leading zeros must survive — this is why the field is a string.
    expect(isValidPostalCode("02134", "US")).toBe(true);
  });
});

describe("aadhaar", () => {
  it("accepts a structurally valid number, with or without formatting", () => {
    expect(isValidAadhaar(VALID_AADHAAR)).toBe(true);
    expect(isValidAadhaar("2345 6789 0124")).toBe(true);
    expect(isValidAadhaar("2345-6789-0124")).toBe(true);
  });

  it("rejects wrong lengths and non-digits", () => {
    expect(isValidAadhaar("23456789012")).toBe(false);
    expect(isValidAadhaar("2345678901245")).toBe(false);
    expect(isValidAadhaar("23456789012a")).toBe(false);
  });

  it("reports WHY a number was rejected, so the user can fix it", () => {
    expect(aadhaarProblem(VALID_AADHAAR)).toBeNull();
    expect(aadhaarProblem("")).toBe("empty");
    expect(aadhaarProblem("   ")).toBe("empty");
    expect(aadhaarProblem("23456789012a")).toBe("non-digit");
    expect(aadhaarProblem("23456789012")).toBe("length");
    expect(aadhaarProblem("2345678901245")).toBe("length");
    expect(aadhaarProblem("012345678901")).toBe("leading-digit");
    // Right length, right leading digit, wrong check digit.
    expect(aadhaarProblem("234567890123")).toBe("checksum");
  });

  it("never echoes the submitted value in an error message", () => {
    for (const bad of ["23456789012", "23456789012a", "012345678901", "234567890123"]) {
      const message = aadhaarError(bad);
      expect(message).toBeTruthy();
      expect(message).not.toContain(bad);
      // Nor any 4+ digit run from the input.
      expect(message).not.toMatch(/[0-9]{4}/);
    }
    expect(aadhaarError(VALID_AADHAAR)).toBeNull();
  });

  it("formats into 4-4-4 groups, dropping non-digits and excess length", () => {
    expect(formatAadhaar("234567890124")).toBe("2345 6789 0124");
    expect(formatAadhaar("2345")).toBe("2345");
    expect(formatAadhaar("23456")).toBe("2345 6");
    expect(formatAadhaar("2345-6789-0124")).toBe("2345 6789 0124");
    expect(formatAadhaar("2a3b4c5d")).toBe("2345");
    // Cannot exceed 12 digits, so the field can never hold an over-long value.
    expect(formatAadhaar("1234567890123456")).toBe("1234 5678 9012");
  });

  it("round-trips formatting through the validator", () => {
    expect(isValidAadhaar(formatAadhaar(VALID_AADHAAR))).toBe(true);
  });

  it("counts digits for the live field counter", () => {
    expect(aadhaarDigitCount("")).toBe(0);
    expect(aadhaarDigitCount("2345 6789 012")).toBe(11);
    expect(aadhaarDigitCount("2345 6789 0124")).toBe(12);
  });

  it("rejects numbers beginning with 0 or 1", () => {
    expect(isValidAadhaar("012345678901")).toBe(false);
    expect(isValidAadhaar("123456789012")).toBe(false);
  });

  it("rejects a failed Verhoeff checksum (single-digit typo)", () => {
    expect(isValidAadhaar("234567890123")).toBe(false);
    expect(verhoeffValid(VALID_AADHAAR)).toBe(true);
  });

  it("normalizes and masks without exposing the full value", () => {
    expect(normalizeAadhaar("2345 6789 0124")).toBe(VALID_AADHAAR);
    const masked = maskAadhaar(VALID_AADHAAR.slice(-4));
    expect(masked).toBe("XXXX-XXXX-0124");
    expect(masked).not.toContain(VALID_AADHAAR);
    expect(masked.replace(/\D/g, "")).toHaveLength(4);
  });
});

describe("country / state reference data", () => {
  it("exposes India with a controlled state list", () => {
    expect(countryByCode("IN")?.name).toBe("India");
    const states = statesFor("IN");
    expect(states).toContain("Gujarat");
    expect(states.length).toBeGreaterThanOrEqual(36);
  });

  it("returns an empty list for countries without master data", () => {
    expect(statesFor("SG")).toEqual([]);
  });

  it("has unique country codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
