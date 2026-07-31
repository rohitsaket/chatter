"use client";
import { create } from "zustand";

/** Local UI state only (never authoritative backend data). */
interface UiState {
  detailOpen: boolean;
  chatTab: "All" | "Unread" | "Favorites";
  threadSearch: string | null; // null = closed, "" = open and empty
  setDetailOpen: (v: boolean) => void;
  setChatTab: (t: "All" | "Unread" | "Favorites") => void;
  setThreadSearch: (v: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  detailOpen: true,
  chatTab: "All",
  threadSearch: null,
  setDetailOpen: (detailOpen) => set({ detailOpen }),
  setChatTab: (chatTab) => set({ chatTab }),
  setThreadSearch: (threadSearch) => set({ threadSearch }),
}));

export function useIsMobile(): boolean {
  // Rendered client-side only inside the app shell.
  if (typeof window === "undefined") return false;
  return window.innerWidth < 760;
}
