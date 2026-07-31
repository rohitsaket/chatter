/**
 * Postgres-native search helpers (initial search backend — no external engine).
 * The API composes these into Prisma raw/where clauses.
 */

/** Escape LIKE/ILIKE wildcards in user input. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Build an ILIKE pattern that matches anywhere in the value. */
export function containsPattern(input: string): string {
  return `%${escapeLike(input.trim())}%`;
}

/**
 * Convert free text to a websearch-style tsquery string safe for
 * `to_tsquery('simple', ...)` — words AND-ed, punctuation stripped.
 */
export function toTsQuery(input: string): string {
  const words = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  return words.map((w) => `${w}:*`).join(" & ");
}
