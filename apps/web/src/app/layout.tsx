import type { Metadata } from "next";
import "@chatter/ui/tokens.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chatter",
  description: "Team messaging, status, calls and files",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      {/*
        Browser extensions (ad/tracker blockers, password managers) write their
        own attributes onto <body> before React hydrates — e.g. `bis_register`,
        `bis_skin_checked`, `__processed_<uuid>__`. Those are not ours and
        cannot be prevented, so hydration warnings for this element's own
        attributes are suppressed. It does NOT cascade to children, so genuine
        mismatches inside the app are still reported.
      */}
      <body suppressHydrationWarning>
        {/*
          Applies the theme before first paint.

          The design tokens key off `body[data-theme]`, and until now that
          attribute was only set inside AppShell — so every /auth/* page
          rendered in light mode regardless of preference, and /app/* flashed
          white before settings loaded. This runs during body parse: it uses the
          last known preference (mirrored to localStorage by AppShell) and falls
          back to the OS setting for visitors who have never signed in.

          AppShell remains authoritative once the server settings arrive.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var t=localStorage.getItem('chatter.theme')||'system';
  var a=localStorage.getItem('chatter.accent')||'purple';
  var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.dataset.theme=dark?'dark':'light';
  if(a&&a!=='purple')document.body.dataset.accent=a;else delete document.body.dataset.accent;
}catch(e){}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
