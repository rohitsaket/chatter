"use client";
import * as React from "react";
import type { MessageDto } from "@chatter/contracts";
import { api } from "@/lib/api";
import { useMe } from "@/lib/queries";
import {
  decryptMessage,
  encryptAttachment,
  encryptMessage,
  initializeE2EE,
  listSafetyNumbers,
  processToDeviceMessages,
  setDeviceTrust,
  type DecryptedContent,
  type E2EEParty,
  type ToDeviceSync,
} from "./crypto";

type CryptoState = "initializing" | "ready" | "failed";

/** Strict E2EE facade: encryption failures are surfaced and never downgraded. */
export function useE2EE() {
  const me = useMe().data;
  const partyRef = React.useRef<E2EEParty | null>(null);
  const syncCursorRef = React.useRef<string | null>(null);
  const [state, setState] = React.useState<CryptoState>("initializing");
  const [error, setError] = React.useState<string | null>(null);
  const [syncEpoch, setSyncEpoch] = React.useState(0);

  React.useEffect(() => {
    if (!me) return;
    let cancelled = false;
    void (async () => {
      try {
        const current = await api<{ deviceId: string }>("/e2ee/devices/current");
        const party = await initializeE2EE(me.id, current.deviceId);
        if (cancelled) return;
        partyRef.current = party;
        setState("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "E2EE initialization failed");
        setState("failed");
      }
    })();
    return () => { cancelled = true; };
  }, [me]);

  React.useEffect(() => {
    if (state !== "ready" || !partyRef.current) return;
    let stopped = false;
    const sync = async () => {
      if (stopped || !partyRef.current) return;
      try {
        const query = syncCursorRef.current ? `?since=${encodeURIComponent(syncCursorRef.current)}` : "";
        const events = await api<ToDeviceSync>(`/e2ee/sync/to-device${query}`);
        await processToDeviceMessages(partyRef.current, events);
        syncCursorRef.current = events.nextSince;
        if (events.events.length || events.deviceChanges.length) setSyncEpoch((value) => value + 1);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "E2EE key sync failed");
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 3_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [state]);

  const encrypt = React.useCallback(async (
    conversationId: string,
    recipientIds: string[],
    content: DecryptedContent,
  ) => {
    if (!partyRef.current || state !== "ready") throw new Error(error ?? "Encryption is not ready");
    return encryptMessage(partyRef.current, conversationId, recipientIds, content);
  }, [error, state]);

  const decrypt = React.useCallback(async (message: MessageDto) => {
    if (!partyRef.current || state !== "ready") throw new Error(error ?? "Encryption is not ready");
    if (!message.encryption) throw new Error("Message has no encrypted envelope");
    return decryptMessage(
      partyRef.current,
      message.conversationId,
      message.id,
      message.senderId,
      message.createdAt,
      message.encryption,
    );
  }, [error, state]);

  const safetyNumbers = React.useCallback(async (userIds: string[]) => {
    if (!partyRef.current || state !== "ready") throw new Error(error ?? "Encryption is not ready");
    return listSafetyNumbers(partyRef.current, userIds);
  }, [error, state]);

  const trustDevice = React.useCallback(async (userId: string, deviceId: string, trust: "verified" | "blocked" | "unset") => {
    if (!partyRef.current || state !== "ready") throw new Error(error ?? "Encryption is not ready");
    await setDeviceTrust(partyRef.current, userId, deviceId, trust);
  }, [error, state]);

  return {
    state,
    isReady: state === "ready",
    isInitializing: state === "initializing",
    error,
    encrypt,
    decrypt,
    encryptAttachment,
    safetyNumbers,
    trustDevice,
    deviceId: partyRef.current?.deviceId ?? null,
    syncEpoch,
  };
}
