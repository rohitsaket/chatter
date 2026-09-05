import { notFound } from "next/navigation";

/**
 * Server-side gate for the throwaway crypto spike.
 *
 * The page underneath initialises a crypto machine and exposes a driving API on
 * `window`. That is acceptable in development and unacceptable in a deployed
 * build, so the route 404s in production unless E2EE_SPIKE is explicitly set.
 * A layout enforces this on the server: the page itself is a client component
 * and could not refuse to render before shipping to the browser.
 */
export default function CryptoSpikeLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.E2EE_SPIKE !== "1") notFound();
  return <>{children}</>;
}
