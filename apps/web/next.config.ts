import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a build target an alternate output directory so it cannot clobber the
  // .next a running dev server is serving from.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@chatter/ui", "@chatter/contracts", "@chatter/realtime"],
  logging: {
    // Next mirrors browser console output into the dev-server terminal. Browser
    // extensions that decorate the DOM (adding e.g. `bis_skin_checked`) trigger
    // React hydration warnings on elements we do not render — including Next's
    // own internal metadata <div>, which cannot be annotated with
    // suppressHydrationWarning. The forwarded noise buried real build output.
    //
    // There is no per-message filter (the option only takes on/off/level, and
    // React logs hydration mismatches at error level), so mirroring is off.
    // Browser errors are still fully visible in the browser devtools console.
    // Set to 'error' or true to restore forwarding.
    browserToTerminal: false,
  },
  async headers() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const ws = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
    // React's development build needs eval() for HMR and for reconstructing
    // callstacks across environments; Turbopack's dev runtime does too. The
    // production bundle never evals, so 'unsafe-eval' is dev-only and the
    // shipped policy keeps only 'wasm-unsafe-eval' (needed by the Matrix
    // crypto WASM module).
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
    ].join(" ");
    return [{
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            `connect-src 'self' ${api} ${ws} ws: wss:`,
            "worker-src 'self' blob:",
          ].join("; "),
        },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
  },
};

export default nextConfig;
