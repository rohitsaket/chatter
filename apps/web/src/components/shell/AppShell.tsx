"use client";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { useConversations, useMe, useNotificationCount, useSettings, useUpdateSettings } from "@/lib/queries";
import { connectRealtime } from "@/lib/socket";
import { PrimarySidebar } from "./PrimarySidebar";
import { MobileShell } from "./MobileShell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const settings = useSettings();
  const qc = useQueryClient();
  const [vw, setVw] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace("/auth/login");
    }
  }, [me.error, router]);

  React.useEffect(() => {
    if (me.data) connectRealtime(qc, me.data.id);
  }, [me.data, qc]);

  // Apply persisted theme/accent to <body> (same mechanism as the prototype).
  const s = settings.data;
  React.useEffect(() => {
    if (!s) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = s.theme === "dark" || (s.theme === "system" && media.matches);
      document.body.dataset.theme = dark ? "dark" : "light";
      if (s.accent === "purple") delete document.body.dataset.accent;
      else document.body.dataset.accent = s.accent;
    };
    apply();

    // Mirror the server-side preference so the pre-paint script in the root
    // layout can theme /auth/* pages and avoid a flash on the next load.
    try {
      window.localStorage.setItem("chatter.theme", s.theme);
      window.localStorage.setItem("chatter.accent", s.accent);
    } catch {
      /* storage unavailable — theming still works for this session */
    }

    // "System" must track the OS switching theme while the app is open.
    if (s.theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [s]);

  const rootFs = s ? 13 + Math.round((s.fontSize - 12) * 0.4) : 13;

  // `vw` is null until the post-mount effect runs, so the server render and the
  // client's first render produce this same markup — hydration-safe without a
  // `typeof window` branch (which would itself diverge server vs. client).
  if (me.isLoading || vw === null) {
    return (
      // Static text with no dynamic input. `suppressHydrationWarning` guards
      // only against browser extensions decorating this node (e.g.
      // `bis_skin_checked`) before React hydrates — it cannot mask a real
      // mismatch here, because nothing in this subtree varies.
      <div
        suppressHydrationWarning
        style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", fontSize: 13.5 }}
      >
        Loading Chatter…
      </div>
    );
  }
  if (!me.data) return null;

  if (vw < 760) {
    return <MobileShell me={me.data}>{children}</MobileShell>;
  }

  return (
    <div style={{ height: "100vh", overflow: "auto", background: "var(--bg)" }}>
      <div style={{ display: "flex", height: "100%", minWidth: 1280, overflow: "hidden", background: "var(--bg)", fontSize: rootFs }}>
        <PrimarySidebar me={me.data} />
        {children}
      </div>
    </div>
  );
}

export function useNavBadges() {
  const convs = useConversations();
  const notifs = useNotificationCount();
  const unreadChats = (convs.data ?? []).filter((c) => c.unreadCount > 0).length;
  return { unreadChats, unreadNotifs: notifs.data?.count ?? 0 };
}

export function useThemeToggle() {
  const settings = useSettings();
  const update = useUpdateSettings();
  return () => {
    const cur = settings.data?.theme ?? "light";
    update.mutate({ theme: cur === "dark" ? "light" : "dark" });
  };
}

export const routeTitles: Record<string, string> = {
  chats: "Chats",
  status: "Status",
  calls: "Calls",
  groups: "Groups",
  contacts: "Contacts",
  files: "Files",
  starred: "Starred",
  archived: "Archived",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Profile",
  admin: "Admin",
};

export function useActiveRoute(): string {
  const pathname = usePathname();
  return pathname.split("/")[2] ?? "chats";
}