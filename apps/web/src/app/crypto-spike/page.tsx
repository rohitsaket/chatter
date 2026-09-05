"use client";
import * as React from "react";

/**
 * SPIKE HARNESS — developer-only. Not linked from the product, not production
 * messaging, and deliberately labelled EXPERIMENTAL rather than "encrypted".
 *
 * The page exposes its operations on `window.__spike` so Playwright can drive
 * two independent browser contexts through a real round trip.
 */
type Line = { t: string; ok: boolean };

export default function CryptoSpikePage() {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const log = (t: string, ok = true) => setLines((l) => [...l, { t, ok }]);

    // Imported inside the effect so the WASM never enters the server bundle.
    void (async () => {
      const h = await import("@/crypto-spike/olm-harness");
      if (cancelled) return;

      const api = {
        harness: h,
        log,
        /** Timings collected for the performance section of the report. */
        marks: {} as Record<string, number>,
        async init(label: string, store: string) {
          const t0 = performance.now();
          const party = await h.createParty(label, store);
          api.marks.initMs = performance.now() - t0;
          return party;
        },
      };
      (window as unknown as { __spike: typeof api }).__spike = api;

      const t0 = performance.now();
      await h.loadCrypto();
      const wasmMs = performance.now() - t0;
      api.marks.wasmLoadMs = wasmMs;
      log(`WASM initialised in ${wasmMs.toFixed(0)} ms`);
      setReady(true);
    })().catch((e) => log(`init failed: ${(e as Error).message}`, false));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ fontFamily: "ui-monospace, monospace", padding: 24, maxWidth: 720 }}>
      <div
        data-testid="spike-badge"
        style={{
          display: "inline-block",
          border: "1px solid #b45309",
          color: "#b45309",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
        }}
      >
        E2EE EXPERIMENTAL
      </div>
      <h1 style={{ fontSize: 18, marginTop: 14 }}>Crypto spike harness</h1>
      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
        Throwaway evaluation of matrix-sdk-crypto-wasm. Not production messaging. No security claim
        is made by this page.
      </p>
      <div data-testid="spike-ready" data-ready={ready ? "1" : "0"} style={{ fontSize: 12 }}>
        status: {ready ? "ready" : "loading…"}
      </div>
      <ul style={{ fontSize: 12.5, lineHeight: 1.7, paddingLeft: 18 }}>
        {lines.map((l, i) => (
          <li key={i} style={{ color: l.ok ? "#166534" : "#b91c1c" }}>
            {l.t}
          </li>
        ))}
      </ul>
    </main>
  );
}
