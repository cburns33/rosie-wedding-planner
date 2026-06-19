"use client";

import { useEffect, useCallback } from "react";
import { applyThemeVars, paletteToThemeVars } from "@/lib/colors/theme";
import type { WeddingState } from "@/lib/types";

async function fetchWeddingState(): Promise<WeddingState | null> {
  try {
    const res = await fetch("/api/wedding-state", {
      cache: "no-store",
      // Unauthenticated requests redirect to /login HTML; do not follow that.
      redirect: "error",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return null;
    return (await res.json()) as WeddingState;
  } catch {
    return null;
  }
}

function applyThemeFromState(state: WeddingState): void {
  const { aesthetic } = state;
  if (aesthetic.themeApplied && aesthetic.palette.length >= 5) {
    applyThemeVars(
      paletteToThemeVars(aesthetic.palette, aesthetic.primaryPicks)
    );
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const syncTheme = useCallback(async () => {
    const state = await fetchWeddingState();
    if (state) applyThemeFromState(state);
  }, []);

  useEffect(() => {
    syncTheme();

    const onUpdate = () => syncTheme();
    window.addEventListener("wedding-state-updated", onUpdate);
    return () => window.removeEventListener("wedding-state-updated", onUpdate);
  }, [syncTheme]);

  return children;
}

export { applyThemeFromState };
