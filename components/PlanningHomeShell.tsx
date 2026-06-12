"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "./Nav";
import PlanningHome from "./PlanningHome";
import WelcomeOverlay from "./WelcomeOverlay";
import { shouldShowWelcome } from "@/lib/intro";
import type { WeddingState } from "@/lib/types";
import type { ZolaAggregates } from "@/lib/zola/normalize";

interface PlanningHomeShellProps {
  initialData: WeddingState;
  initialZola?: ZolaAggregates | null;
}

/**
 * Wraps the planning briefing and keeps it fresh without a manual reload:
 * refetches whenever the tab regains focus/visibility or a chat reply
 * broadcasts an update.
 */
export default function PlanningHomeShell({
  initialData,
  initialZola = null,
}: PlanningHomeShellProps) {
  const [data, setData] = useState(initialData);
  const [zola, setZola] = useState<ZolaAggregates | null>(initialZola);
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome(initialData));
  const [dismissingWelcome, setDismissingWelcome] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/wedding-state", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // Keep showing the last good state on a transient failure.
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

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetch();
        refetchZola();
      }
    };
    const onFocus = () => {
      refetch();
      refetchZola();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("wedding-state-updated", refetch);
    window.addEventListener("zola-snapshot-updated", refetchZola);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wedding-state-updated", refetch);
      window.removeEventListener("zola-snapshot-updated", refetchZola);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch, refetchZola]);

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
        <PlanningHome data={data} zola={zola} />
      </main>
      {showWelcome && (
        <WelcomeOverlay onDismiss={handleWelcomeDismiss} dismissing={dismissingWelcome} />
      )}
    </div>
  );
}
