"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "./Nav";
import PlanningHome from "./PlanningHome";
import type { WeddingState } from "@/lib/types";

interface PlanningHomeShellProps {
  initialData: WeddingState;
}

/**
 * Wraps the planning briefing and keeps it fresh without a manual reload:
 * refetches whenever the tab regains focus/visibility or a chat reply
 * broadcasts an update.
 */
export default function PlanningHomeShell({
  initialData,
}: PlanningHomeShellProps) {
  const [data, setData] = useState(initialData);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/wedding-state", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // Keep showing the last good state on a transient failure.
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    window.addEventListener("wedding-state-updated", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("wedding-state-updated", refetch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch]);

  return (
    <div className="flex flex-col min-h-full">
      <Nav />
      <main className="flex-1 pt-16 overflow-y-auto">
        <PlanningHome data={data} />
      </main>
    </div>
  );
}
