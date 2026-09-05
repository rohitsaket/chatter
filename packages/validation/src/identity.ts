/**
 * Identity & address validation shared by the web form and the API.
 *
 * The API is the authority — the browser uses these same helpers only so the
 * user sees errors before submitting. Never rely on the client having run them.
 */
import { z } from "zod";

export interface Country {
  /** ISO 3166-1 alpha-2, the stored representation. */
  code: string;
  name: string;
  /** E.164 calling code, without "+". */
  dial: string;
  /** Postal/PIN code shape for this country. */
  postal: RegExp;
  postalLabel: string;
}

/**
 * Supported countries. `code` is what gets persisted, so entries may be added
 * but existing codes must never be repurposed.
 */
export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", dial: "91", postal: /^[1-9][0-9]{5}$/, postalLabel: "6-digit PIN code" },
  { code: "US", name: "United States", dial: "1", postal: /^[0-9]{5}(-[0-9]{4})?$/, postalLabel: "5-digit ZIP code" },
  { code: "GB", name: "United Kingdom", dial: "44", postal: /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i, postalLabel: "UK postcode" },
  { code: "CA", name: "Canada", dial: "1", postal: /^[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]$/i, postalLabel: "Canadian postal code" },
  { code: "AU", name: "Australia", dial: "61", postal: /^[0-9]{4}$/, postalLabel: "4-digit postcode" },
  { code: "AE", name: "United Arab Emirates", dial: "971", postal: /^[0-9]{5,6}$/, postalLabel: "postal code" },
  { code: "SG", name: "Singapore", dial: "65", postal: /^[0-9]{6}$/, postalLabel: "6-digit postal code" },
  { code: "DE", name: "Germany", dial: "49", postal: /^[0-9]{5}$/, postalLabel: "5-digit postal code" },
  { code: "FR", name: "France", dial: "33", postal: /^[0-9]{5}$/, postalLabel: "5-digit postal code" },
  { code: "JP", name: "Japan", dial: "81", postal: /^[0-9]{3}-?[0-9]{4}$/, postalLabel: "postal code" },
  { code: "NZ", name: "New Zealand", dial: "64", postal: /^[0-9]{4}$/, postalLabel: "4-digit postcode" },
  { code: "ZA", name: "South Africa", dial: "27", postal: /^[0-9]{4}$/, postalLabel: "4-digit postal code" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Controlled state/UT lists where a canonical set exists. Countries absent from
 * this map accept validated free text (see `stateSchemaFor`).
 */
export const STATES: Record<string, string[]> = {
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry",
  ],
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
    "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
    "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
    "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
  ],
};

export function statesFor(countryCode: string): string[] {
  return STATES[countryCode] ?? [];
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * Person-name component. Unicode letters, marks, spaces, apostrophes, hyphens
 * and periods — deliberately permissive so legitimate non-ASCII names are not
 * rejected. Rejects whitespace-only input via the post-trim length check.
 */
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(80, "Must be 80 characters or fewer")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u, "Enter a valid name");

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------

/**
 * Normalize a mobile number to E.164 for the given country, or return null when
 * it cannot be represented. Accepts local form ("98765 43210"), national form
 * with a trunk zero, and full international form.
 */
export function normalizeMobile(input: string, countryCode: string): string | null {
  const country = countryByCode(countryCode);
  if (!country) return null;

  const cleaned = input.replace(/[\s()\-.]/g, "");
  let digits: string;

  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
    if (!/^[0-9]{8,15}$/.test(digits)) return null;
    // An explicit "+" must match the selected country.
    if (!digits.startsWith(country.dial)) return null;
  } else {
    let local = cleaned.replace(/^0+/, "");
    if (!/^[0-9]+$/.test(local)) return null;
    if (local.startsWith(country.dial) && local.length > 10) local = local.slice(country.dial.length);
    digits = country.dial + local;
  }

  const subscriber = digits.slice(country.dial.length);
  if (subscriber.length < 6 || subscriber.length > 12) return null;
  // India: mobile numbers are 10 digits beginning 6-9.
  if (country.code === "IN" && !/^[6-9][0-9]{9}$/.test(subscriber)) return null;
  return `+${digits}`;
}

// ---------------------------------------------------------------------------
// Postal / PIN
// ---------------------------------------------------------------------------

/** Stored as a string — postal codes may carry meaningful leading zeros. */
export function isValidPostalCode(value: string, countryCode: string): boolean {
  const country = countryByCode(countryCode);
  if (!country) return false;
  return country.postal.test(value.trim());
}

// ---------------------------------------------------------------------------
// Aadhaar
// ---------------------------------------------------------------------------

// Verhoeff dihedral-group tables (the checksum scheme Aadhaar uses).
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** True when the digit string satisfies the Verhoeff checksum. */
export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![Number(reversed[i])]!]!;
  }
  return c === 0;
}

/** Strip formatting; Aadhaar is commonly written in 4-4-4 groups. */
export function normalizeAadhaar(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/** Why a candidate Aadhaar was rejected. `null` means it is structurally valid. */
export type AadhaarProblem = "empty" | "non-digit" | "length" | "leading-digit" | "checksum";

/**
 * Structural validity only — this proves nothing about whether the number is
 * actually issued.
 *
 * Returns the *reason* for rejection rather than a bare boolean, so the caller
 * can tell the user what to correct. A masked input field gives no visual
 * feedback, so "invalid" alone leaves nobody able to fix their own typo.
 */
export function aadhaarProblem(input: string): AadhaarProblem | null {
  const d = normalizeAadhaar(input);
  if (d.length === 0) return "empty";
  if (!/^[0-9]+$/.test(d)) return "non-digit";
  if (d.length !== 12) return "length";
  if (d[0] === "0" || d[0] === "1") return "leading-digit"; // Aadhaar never begins 0 or 1
  return verhoeffValid(d) ? null : "checksum";
}

/**
 * Human-readable text for a rejection reason. Deliberately describes the *rule*
 * that was broken and never echoes the submitted value, so the same wording is
 * safe to return from the API as well as render in the browser.
 */
export const AADHAAR_MESSAGES: Record<AadhaarProblem, string> = {
  empty: "Aadhaar number is required",
  "non-digit": "Aadhaar number must contain only digits",
  length: "Aadhaar number must be exactly 12 digits",
  "leading-digit": "Aadhaar number cannot begin with 0 or 1",
  checksum: "That is not a valid Aadhaar number — please re-check the digits",
};

/** Message for whatever is wrong with `input`, or `null` when it is valid. */
export function aadhaarError(input: string): string | null {
  const problem = aadhaarProblem(input);
  return problem === null ? null : AADHAAR_MESSAGES[problem];
}

/** Structural validity as a boolean. See `aadhaarProblem` for the reason. */
export function isValidAadhaar(input: string): boolean {
  return aadhaarProblem(input) === null;
}

/**
 * Format as the familiar 4-4-4 groups while the user types. Non-digits are
 * dropped and the result is capped at 12 digits, so the field cannot hold
 * anything the validator would later reject on length or character grounds.
 */
export function formatAadhaar(input: string): string {
  const d = input.replace(/[^0-9]/g, "").slice(0, 12);
  return d.replace(/(.{4})(?=.)/g, "$1 ");
}

/** How many digits the field currently holds — for a live "n of 12" counter. */
export function aadhaarDigitCount(input: string): number {
  return normalizeAadhaar(input).replace(/[^0-9]/g, "").length;
}

/** Display form. Only the last four digits are ever shown. */
export function maskAadhaar(last4: string): string {
  return `XXXX-XXXX-${last4}`;
}
