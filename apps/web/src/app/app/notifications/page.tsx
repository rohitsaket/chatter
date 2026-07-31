"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SimpleCard, SimpleListShell } from "@/components/simple/SimpleList";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useNotifications } from "@/lib/queries";

export default function NotificationsPage() {
  const notifications = useNotifications();
  const qc = useQueryClient();
  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <SimpleListShell
      title="Notifications"
      subtitle={unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All caught up"}
      action={unread ? "Mark all as read" : "All read ✓"}
      onAction={() =>
        api("/notifications/mark-all-read", { method: "POST" }).then(() => {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["notification-count"] });
        })
      }
    >
      {items.map((n) => (
        <SimpleCard
          key={n.id}
          avatar={n.actor?.initials ?? (n.type === "announcement" ? "📣" : "🔔")}
          avatarBg={n.actor?.avatarColor ?? "linear-gradient(135deg,#8950f5,#5e28c7)"}
          title={n.title}
          time={relativeTime(n.createdAt)}
          body={n.body}
          dot={!n.read}
          href={n.deepLink ?? undefined}
        />
      ))}
      {items.length === 0 && !notifications.isLoading && (
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20, textAlign: "center" }}>No notifications.</div>
      )}
    </SimpleListShell>
  );
}
