"use client";
import { create } from "zustand";

/** Local UI state only (never authoritative backend data). */
interface UiState {
  detailOpen: boolean;
  chatTab: "All" | "Unread" | "Favorites";
  setDetailOpen: (v: boolean) => void;
  setChatTab: (t: "All" | "Unread" | "Favorites") => void;
}

export const useUiStore = create<UiState>((set) => ({
  detailOpen: true,
  chatTab: "All",
  setDetailOpen: (detailOpen) => set({ detailOpen }),
  setChatTab: (chatTab) => set({ chatTab }),
}));

export function useIsMobile(): boolean {
  // Rendered client-side only inside the app shell.
  if (typeof window === "undefined") return false;
  return window.innerWidth < 760;
}
