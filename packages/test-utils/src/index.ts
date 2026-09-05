import { PrismaClient } from "@chatter/database";

/**
 * Truncate all application tables between integration tests.
 * FK checks are disabled for the sweep so table order does not matter.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ TABLE_NAME: string }[]>`
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME NOT IN ('_prisma_migrations')
  `;
  if (tables.length === 0) return;
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t.TABLE_NAME}\``);
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

/** Minimal cookie jar for supertest-style session flows. */
export class CookieJar {
  private cookies = new Map<string, string>();

  absorb(setCookieHeaders: string[] | undefined): void {
    for (const raw of setCookieHeaders ?? []) {
      const [pair] = raw.split(";");
      if (!pair) continue;
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}
