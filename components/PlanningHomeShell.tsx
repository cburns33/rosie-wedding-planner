"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Nav from "./Nav";
import PlanningHome from "./PlanningHome";
import WelcomeOverlay from "./WelcomeOverlay";
import { shouldShowWelcome } from "@/lib/intro";
import type { InspirationCardSummary } from "@/lib/inspiration";
import type { WeddingState } from "@/lib/types";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import type { ZolaAggregates } from "@/lib/zola/normalize";

interface PlanningHomeShellProps {
  initialData: WeddingState;
  initialZola?: ZolaAggregates | null;
  initialInspirationSummary?: InspirationCardSummary;
}

/**
 * Wraps the planning briefing and keeps it fresh without a manual reload:
 * refetches whenever the tab regains focus/visibility or a chat reply
 * broadcasts an update.
 */
export default function PlanningHomeShell({
  initialData,
  initialZola = null,
  initialInspirationSummary = { observationCount: 0, latestPreview: null },
}: PlanningHomeShellProps) {
  const [data, setData] = useState(initialData);
  const [zola, setZola] = useState<ZolaAggregates | null>(initialZola);
  const [inspirationSummary, setInspirationSummary] = useState(
    initialInspirationSummary
  );
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome(initialData));
  const [dismissingWelcome, setDismissingWelcome] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/wedding-state", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        setData(mergeWeddingState((await res.json()) as Partial<WeddingState>));
      }
    } catch {
      // Keep showing the last good state on a transient failure.
    }
  }, []);

  const refetchInspiration = useCallback(async () => {
    try {
      const res = await fetch("/api/inspiration-memory", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) setInspirationSummary(await res.json());
    } catch {
      // Keep showing the last good summary on a transient failure.
    }
  }, []);

  const refetchZola = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/zola", { cache: "no-store" });
      if (res.ok) setZola(await res.json());
    } catch {
      // Keep showing the last good snapshot on a transient failure.
    }
  }, []);

  const refetchAll = useCallback(() => {
    void refetch();
    void refetchInspiration();
    void refetchZola();
  }, [refetch, refetchInspiration, refetchZola]);

  const refetchAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetchAll = useCallback(() => {
    if (refetchAllTimerRef.current) clearTimeout(refetchAllTimerRef.current);
    refetchAllTimerRef.current = setTimeout(() => {
      refetchAllTimerRef.current = null;
      refetchAll();
    }, 300);
  }, [refetchAll]);

  useEffect(() => {
    setShowWelcome(shouldShowWelcome(initialData));
    refetchAll();
    return () => {
      if (refetchAllTimerRef.current) clearTimeout(refetchAllTimerRef.current);
    };
  }, [initialData, refetchAll]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefetchAll();
    };
    const onFocus = () => scheduleRefetchAll();
    const onStateUpdated = () => scheduleRefetchAll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("wedding-state-updated", onStateUpdated);
    window.addEventListener("zola-snapshot-updated", refetchZola);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wedding-state-updated", onStateUpdated);
      window.removeEventListener("zola-snapshot-updated", refetchZola);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [scheduleRefetchAll, refetchZola]);

  async function handleWelcomeDismiss() {
    if (dismissingWelcome) return;
    setDismissingWelcome(true);

    try {
      await fetch("/api/wedding-state/complete-intro", { method: "POST" });
      setData((prev) => ({ ...prev, intro_completed: true }));
      window.dispatchEvent(new Event("wedding-state-updated"));
    } catch {
      setDismissingWelcome(false);
      return;
    }

    window.setTimeout(() => {
      setShowWelcome(false);
      setDismissingWelcome(false);
      document.getElementById("up-next")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Nav />
      <main className="flex-1 pt-16 overflow-y-auto">
        <PlanningHome
          data={data}
          zola={zola}
          inspirationSummary={inspirationSummary}
        />
      </main>
      {showWelcome && (
        <WelcomeOverlay onDismiss={handleWelcomeDismiss} dismissing={dismissingWelcome} />
      )}
    </div>
  );
}
