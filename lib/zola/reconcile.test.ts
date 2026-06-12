import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState, ZolaSnapshot } from "@/lib/types";

// In-memory stand-in for the single wedding_state row (id = 1).
let storedState: WeddingState;
let readError: { message: string } | null;
let upsertError: { message: string } | null;
const upsertSpy = vi.fn();

vi.mock("@/lib/supabase", () => {
  const from = () => ({
    select: () => ({
      eq: () => ({
        single: async () =>
          readError
            ? { data: null, error: readError }
            : { data: { data: storedState }, error: null },
      }),
    }),
    upsert: (row: { id: number; data: WeddingState; updated_at: string }) => {
      upsertSpy(row);
      if (upsertError) return Promise.resolve({ data: null, error: upsertError });
      storedState = row.data;
      return Promise.resolve({ data: null, error: null });
    },
  });
  return { getSupabase: () => ({ from }) };
});

import { reconcileWeddingState } from "@/lib/zola/reconcile";

function snapshot(summary: Partial<ZolaSnapshot["summary"]>): ZolaSnapshot {
  return {
    summary: { invited: 0, attending: 0, declined: 0, pending: 0, households: 0, ...summary },
    syncedAt: "2026-06-12T12:00:00.000Z",
  };
}

function lastUpsertedState(): WeddingState {
  return upsertSpy.mock.calls.at(-1)![0].data;
}

beforeEach(() => {
  storedState = structuredClone(DEFAULT_WEDDING_STATE);
  readError = null;
  upsertError = null;
  upsertSpy.mockClear();
});

describe("reconcileWeddingState — guests write-through", () => {
  it("writes RSVP aggregates into wedding_state.guests", async () => {
    await reconcileWeddingState(
      snapshot({ invited: 150, attending: 120, pending: 20, declined: 10 }),
      null
    );
    const state = lastUpsertedState();
    expect(state.guests).toMatchObject({
      finalCount: 150,
      rsvpAttending: 120,
      rsvpPending: 20,
      rsvpDeclined: 10,
      lastZolaImportAt: "2026-06-12T12:00:00.000Z",
    });
  });

  it("marks the Zola integration as API-connected", async () => {
    await reconcileWeddingState(snapshot({ invited: 100, attending: 100 }), null);
    expect(lastUpsertedState().integrations.zola).toMatchObject({
      syncMethod: "api",
      apiConnected: true,
    });
  });

  it("does not clobber an existing finalCount when invited is 0", async () => {
    storedState = structuredClone(DEFAULT_WEDDING_STATE);
    storedState.guests.finalCount = 275;
    await reconcileWeddingState(snapshot({ invited: 0 }), 275);
    expect(lastUpsertedState().guests.finalCount).toBe(275);
  });
});

describe("reconcileWeddingState — >10% decisions[] threshold", () => {
  it("logs a decision when invited moves more than 10%", async () => {
    await reconcileWeddingState(snapshot({ invited: 120, attending: 120 }), 100);
    const decisions = lastUpsertedState().decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decision).toContain("100");
    expect(decisions[0].decision).toContain("120");
  });

  it("does NOT log at exactly 10% (strictly greater than required)", async () => {
    await reconcileWeddingState(snapshot({ invited: 110, attending: 110 }), 100);
    expect(lastUpsertedState().decisions).toHaveLength(0);
  });

  it("does not log on the first sync (previousInvited null)", async () => {
    await reconcileWeddingState(snapshot({ invited: 300, attending: 300 }), null);
    expect(lastUpsertedState().decisions).toHaveLength(0);
  });

  it("does not log when previousInvited is 0 (avoids divide-by-zero)", async () => {
    await reconcileWeddingState(snapshot({ invited: 200, attending: 200 }), 0);
    expect(lastUpsertedState().decisions).toHaveLength(0);
  });

  it("does not log when invited drops to 0 (treated as missing data)", async () => {
    await reconcileWeddingState(snapshot({ invited: 0 }), 250);
    expect(lastUpsertedState().decisions).toHaveLength(0);
  });

  it("appends to existing decisions rather than replacing them", async () => {
    storedState = structuredClone(DEFAULT_WEDDING_STATE);
    storedState.decisions = [{ date: "2026-01-01", decision: "Booked the venue." }];
    await reconcileWeddingState(snapshot({ invited: 50, attending: 50 }), 100);
    const decisions = lastUpsertedState().decisions;
    expect(decisions).toHaveLength(2);
    expect(decisions[0].decision).toBe("Booked the venue.");
  });
});

describe("reconcileWeddingState — surfaces DB failures (no silent writes)", () => {
  it("throws when the wedding_state upsert is rejected (e.g. RLS denial)", async () => {
    upsertError = { message: "new row violates row-level security policy" };
    await expect(
      reconcileWeddingState(snapshot({ invited: 100, attending: 100 }), null)
    ).rejects.toThrow(/wedding_state upsert failed/);
  });

  it("throws when the wedding_state read is rejected", async () => {
    readError = { message: "permission denied for table wedding_state" };
    await expect(
      reconcileWeddingState(snapshot({ invited: 100, attending: 100 }), null)
    ).rejects.toThrow(/wedding_state read failed/);
  });
});
