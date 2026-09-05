"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminMemberDto,
  AuditEventDto,
  CallTokenDto,
  ContactDto,
  ConversationDto,
  FileDto,
  GroupDto,
  MeDto,
  MessageDto,
  SendMessageBody,
  NotificationDto,
  Page,
  SettingsDto,
  StatusDto,
  StorageSummaryDto,
  UpdateSettingsBody,
} from "@chatter/contracts";
import { api } from "./api";
import { disconnectRealtime } from "./socket";
import { destroyLocalE2EE } from "./e2ee/crypto";

export function useMe() {
  return useQuery<MeDto>({ queryKey: ["me"], queryFn: () => api("/users/me"), retry: false });
}

export function useConversations(archived = false) {
  return useQuery<ConversationDto[]>({
    queryKey: ["conversations", archived],
    queryFn: () => api(`/conversations?archived=${archived}`),
  });
}

export function useConversation(idOrSlug: string | null) {
  return useQuery<ConversationDto>({
    queryKey: ["conversation", idOrSlug],
    queryFn: () => api(`/conversations/${idOrSlug}`),
    enabled: Boolean(idOrSlug),
  });
}

export function useMessages(idOrSlug: string | null) {
  return useQuery<Page<MessageDto>>({
    queryKey: ["messages", idOrSlug],
    queryFn: () => api(`/conversations/${idOrSlug}/messages?limit=80`),
    enabled: Boolean(idOrSlug),
  });
}

export function useSendMessage(idOrSlug: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<SendMessageBody, "idempotencyKey">) =>
      api<MessageDto>(`/conversations/${idOrSlug}/messages`, {
        method: "POST",
        json: {
          ...body,
          idempotencyKey: crypto.randomUUID(),
        },
      }),
    onSuccess: (msg) => {
      qc.setQueryData<Page<MessageDto>>(["messages", idOrSlug], (old) =>
        old ? { ...old, items: [...old.items.filter((m) => m.id !== msg.id), msg] } : { items: [msg], nextCursor: null },
      );
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idOrSlug: string) => api(`/conversations/${idOrSlug}/read`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api<MessageDto>(`/messages/${messageId}/react`, { method: "POST", json: { emoji } }),
    onSuccess: (msg) => updateMessage(qc, msg),
  });
}

export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, optionId }: { messageId: string; optionId: string }) =>
      api<MessageDto>(`/messages/${messageId}/vote`, { method: "POST", json: { optionId } }),
    onSuccess: (msg) => updateMessage(qc, msg),
  });
}

function updateMessage(qc: ReturnType<typeof useQueryClient>, msg: MessageDto) {
  qc.setQueriesData<Page<MessageDto>>({ queryKey: ["messages"] }, (old) =>
    old ? { ...old, items: old.items.map((m) => (m.id === msg.id ? msg : m)) } : old,
  );
}

export function useStatuses() {
  return useQuery<StatusDto[]>({ queryKey: ["statuses"], queryFn: () => api("/statuses") });
}

export function useContacts(q?: string) {
  return useQuery<ContactDto[]>({
    queryKey: ["contacts", q ?? ""],
    queryFn: () => api(`/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useGroups() {
  return useQuery<GroupDto[]>({ queryKey: ["groups"], queryFn: () => api("/groups") });
}

export function useGroup(id: string | null) {
  return useQuery<GroupDto>({
    queryKey: ["group", id],
    queryFn: () => api(`/groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useFiles(q?: string) {
  return useQuery<FileDto[]>({
    queryKey: ["files", q ?? ""],
    queryFn: () => api(`/files${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useFile(id: string | null) {
  return useQuery<FileDto>({ queryKey: ["file", id], queryFn: () => api(`/files/${id}`), enabled: Boolean(id) });
}

export function useNotifications() {
  return useQuery<NotificationDto[]>({ queryKey: ["notifications"], queryFn: () => api("/notifications") });
}

export function useNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notification-count"],
    queryFn: () => api("/notifications/unread-count"),
  });
}

export function useSettings() {
  return useQuery<SettingsDto>({ queryKey: ["settings"], queryFn: () => api("/settings") });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateSettingsBody) => api<SettingsDto>("/settings", { method: "PATCH", json: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["settings"] });
      const prev = qc.getQueryData<SettingsDto>(["settings"]);
      if (prev) qc.setQueryData(["settings"], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["settings"], ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useAdminMembers(enabled = true) {
  return useQuery<AdminMemberDto[]>({ queryKey: ["admin-members"], queryFn: () => api("/admin/members"), enabled });
}

/**
 * Org storage summary. `/admin/storage` is admin-only, so callers must pass
 * `enabled: false` for non-admins — otherwise every ordinary user fires a
 * request that can only ever 403.
 */
export function useAdminStorage(enabled = true) {
  return useQuery<StorageSummaryDto>({
    queryKey: ["admin-storage"],
    queryFn: () => api("/admin/storage"),
    enabled,
  });
}

export function useAdminAudit(enabled = true) {
  return useQuery<AuditEventDto[]>({ queryKey: ["admin-audit"], queryFn: () => api("/admin/audit"), enabled });
}

/**
 * Sign out: revoke the server session, then tear down all client state.
 * The socket must be closed explicitly — it is a module-level singleton, so a
 * subsequent login would otherwise reuse the connection bound to the revoked
 * session. The query cache is cleared so the next user never sees cached data
 * belonging to the previous one.
 */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>("/auth/logout", { method: "POST" }),
    onSettled: async () => {
      disconnectRealtime();
      await destroyLocalE2EE();
      qc.clear();
      // Full document navigation, so no stale React state survives the switch.
      window.location.href = "/auth/login";
    },
  });
}

export function useJoinCall() {
  return useMutation({
    mutationFn: (idOrSlug: string) => api<CallTokenDto>(`/calls/join/${idOrSlug}`, { method: "POST" }),
  });
}
