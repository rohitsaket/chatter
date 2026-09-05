"use client";
import { create } from "zustand";

/** Local UI state only (never authoritative backend data). */
interface UiState {
  detailOpen: boolean;
  chatTab: "All" | "Unread" | "Favorites";
  threadSearch: string | null; // null = closed, "" = open and empty
  /** Primary sidebar collapsed to an icon-only rail (desktop only). */
  sidebarCollapsed: boolean;
  setDetailOpen: (v: boolean) => void;
  setChatTab: (t: "All" | "Unread" | "Favorites") => void;
  setThreadSearch: (v: string | null) => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  detailOpen: true,
  chatTab: "All",
  threadSearch: null,
  // Starts expanded; the persisted preference is restored after mount so the
  // store never reads browser storage during render.
  sidebarCollapsed: false,
  setDetailOpen: (detailOpen) => set({ detailOpen }),
  setChatTab: (chatTab) => set({ chatTab }),
  setThreadSearch: (threadSearch) => set({ threadSearch }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));

/** localStorage key for the sidebar preference. */
export const SIDEBAR_COLLAPSED_KEY = "chatter.sidebarCollapsed";
