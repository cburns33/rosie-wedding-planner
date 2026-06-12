import { describe, it, expect } from "vitest";
import {
  normalizeSnapshot,
  toAggregates,
  STALE_AFTER_MS,
  type NormalizeInput,
  type RawZolaEvent,
} from "@/lib/zola/normalize";

const SYNCED_AT = "2026-06-12T12:00:00.000Z";

function input(partial: Partial<NormalizeInput>): NormalizeInput {
  return {
    events: [],
    giftTracker: null,
    budget: null,
    syncedAt: SYNCED_AT,
    ...partial,
  };
}

describe("normalizeSnapshot — headline event selection", () => {
  it("picks the main wedding event by type even when another event has more guests", () => {
    const events: RawZolaEvent[] = [
      {
        name: "Welcome Drinks",
        type: "WELCOME_PARTY",
        num_guests_attending: 200,
        num_guests_declined: 0,
        num_guests_not_responded: 0,
      },
      {
        name: "The Wedding",
        type: "WEDDING",
        num_guests_attending: 120,
        num_guests_declined: 10,
        num_guests_not_responded: 20,
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.summary).toMatchObject({
      invited: 150,
      attending: 120,
      declined: 10,
      pending: 20,
    });
  });

  it("matches the main event case-insensitively and via name fallback", () => {
    const events: RawZolaEvent[] = [
      { name: "Rehearsal Dinner", type: "REHEARSAL_DINNER", num_guests_attending: 40 },
      { name: "Ceremony & Reception", num_guests_attending: 90, num_guests_not_responded: 10 },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.summary.attending).toBe(90);
    expect(snap.summary.invited).toBe(100);
  });

  it("falls back to the largest event when none are main-type", () => {
    const events: RawZolaEvent[] = [
      { name: "Brunch", type: "BRUNCH", num_guests_attending: 30 },
      { name: "Welcome Party", type: "WELCOME_PARTY", num_guests_attending: 75, num_guests_declined: 5 },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.summary.invited).toBe(80);
    expect(snap.summary.attending).toBe(75);
  });

  it("returns a zeroed summary and undefined events when no events exist", () => {
    const snap = normalizeSnapshot(input({ events: [] }));
    expect(snap.summary).toEqual({
      invited: 0,
      attending: 0,
      declined: 0,
      pending: 0,
      households: 0,
    });
    expect(snap.events).toBeUndefined();
  });

  it("emits all events in the events[] array regardless of headline", () => {
    const events: RawZolaEvent[] = [
      { name: "Welcome Drinks", type: "WELCOME_PARTY", num_guests_attending: 200 },
      { name: "The Wedding", type: "WEDDING", num_guests_attending: 120 },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.events).toHaveLength(2);
    expect(snap.events?.map((e) => e.name)).toEqual(["Welcome Drinks", "The Wedding"]);
  });

  it("defaults a missing event name to 'Event'", () => {
    const events: RawZolaEvent[] = [{ type: "WEDDING", num_guests_attending: 50 }];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.events?.[0].name).toBe("Event");
  });
});

describe("normalizeSnapshot — meal choice guard", () => {
  it("does NOT fabricate meal choices from menu-definition-only options (no count field)", () => {
    const events: RawZolaEvent[] = [
      {
        name: "The Wedding",
        type: "WEDDING",
        num_guests_attending: 100,
        meal_options: [{ name: "Chicken" }, { name: "Beef" }, { name: "Vegetarian" }],
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.meals).toBeUndefined();
  });

  it("emits aggregate counts when a count field is present", () => {
    const events: RawZolaEvent[] = [
      {
        name: "The Wedding",
        type: "WEDDING",
        num_guests_attending: 100,
        meal_options: [
          { name: "Chicken", count: 45 },
          { name: "Beef", num_guests: 30 },
          { name: "Vegetarian", quantity: 25 },
        ],
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.meals?.choices).toEqual({ Chicken: 45, Beef: 30, Vegetarian: 25 });
  });

  it("sums duplicate labels and ignores options without a label", () => {
    const events: RawZolaEvent[] = [
      {
        name: "The Wedding",
        type: "WEDDING",
        num_guests_attending: 100,
        meal_options: [
          { name: "Chicken", count: 10 },
          { name: "Chicken", count: 5 },
          { count: 99 },
        ],
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.meals?.choices).toEqual({ Chicken: 15 });
  });

  it("only reads meals from the headline event", () => {
    const events: RawZolaEvent[] = [
      {
        name: "Rehearsal Dinner",
        type: "REHEARSAL_DINNER",
        num_guests_attending: 40,
        meal_options: [{ name: "Pasta", count: 40 }],
      },
      {
        name: "The Wedding",
        type: "WEDDING",
        num_guests_attending: 100,
        meal_options: [{ name: "Chicken", count: 60 }],
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.meals?.choices).toEqual({ Chicken: 60 });
  });
});

describe("normalizeSnapshot — null registry path", () => {
  it("omits registry entirely when giftTracker is null", () => {
    const snap = normalizeSnapshot(input({ giftTracker: null }));
    expect(snap.registry).toBeUndefined();
  });

  it("counts gifts received and thank-you-pending notes", () => {
    const snap = normalizeSnapshot(
      input({
        giftTracker: {
          total_gifts_received: 12,
          gifts: [
            { thank_you_note_status: "SENT" },
            { thank_you_note_status: "PENDING" },
            { thank_you_note_status: null },
            { thank_you_note_status: "not_started" },
          ],
        },
      })
    );
    expect(snap.registry?.giftsReceived).toBe(12);
    // "PENDING" and "not_started" are pending; null and "SENT" are not.
    expect(snap.registry?.thankYouPending).toBe(2);
  });

  it("includes fundsReceived only when total_gift_value is present", () => {
    const withValue = normalizeSnapshot(
      input({ giftTracker: { total_gifts_received: 1, total_gift_value: 500 } })
    );
    expect(withValue.registry?.fundsReceived).toBe(500);

    const withoutValue = normalizeSnapshot(
      input({ giftTracker: { total_gifts_received: 1 } })
    );
    expect(withoutValue.registry).not.toHaveProperty("fundsReceived");
  });
});

describe("normalizeSnapshot — budget", () => {
  it("converts cents to whole dollars and counts categories", () => {
    const snap = normalizeSnapshot(
      input({
        budget: {
          budgeted_cents: 7_500_000,
          cost_cents: 1_234_567,
          taxonomy_nodes: [{ items: [] }, { items: [] }, { items: [] }],
        },
      })
    );
    expect(snap.budget).toEqual({
      plannedTotal: 75000,
      spentTotal: 12346,
      categoryCount: 3,
    });
  });

  it("omits budget when input.budget is null", () => {
    const snap = normalizeSnapshot(input({ budget: null }));
    expect(snap.budget).toBeUndefined();
  });
});

describe("normalizeSnapshot — defensive number coercion", () => {
  it("coerces missing/non-numeric counts to 0", () => {
    const events: RawZolaEvent[] = [
      {
        name: "The Wedding",
        type: "WEDDING",
        // @ts-expect-error — exercising a malformed payload
        num_guests_attending: "lots",
        num_guests_declined: undefined,
      },
    ];
    const snap = normalizeSnapshot(input({ events }));
    expect(snap.summary).toMatchObject({ invited: 0, attending: 0, declined: 0, pending: 0 });
  });
});

describe("toAggregates", () => {
  it("returns unavailable shape when snapshot or importedAt is missing", () => {
    const agg = toAggregates(null, null, "https://zola.example");
    expect(agg).toEqual({
      available: false,
      profileUrl: "https://zola.example",
      syncedAt: null,
      stale: false,
      rsvp: null,
      registry: null,
    });
  });

  it("maps a snapshot to the public PII-free shape", () => {
    const snap = normalizeSnapshot(
      input({
        events: [{ name: "The Wedding", type: "WEDDING", num_guests_attending: 100, num_guests_not_responded: 20 }],
        giftTracker: { total_gifts_received: 5, gifts: [{ thank_you_note_status: "pending" }] },
      })
    );
    const importedAt = new Date().toISOString();
    const agg = toAggregates(snap, importedAt, "https://zola.example");
    expect(agg.available).toBe(true);
    expect(agg.rsvp).toEqual({ attending: 100, pending: 20, declined: 0 });
    expect(agg.registry).toEqual({ giftsReceived: 5, thankYouPending: 1 });
    expect(agg.stale).toBe(false);
  });

  it("maps a snapshot with no registry to registry: null", () => {
    const snap = normalizeSnapshot(input({ giftTracker: null }));
    const agg = toAggregates(snap, new Date().toISOString(), null);
    expect(agg.registry).toBeNull();
  });

  it("flags data older than the stale threshold", () => {
    const snap = normalizeSnapshot(input({}));
    const old = new Date(Date.now() - STALE_AFTER_MS - 1000).toISOString();
    const agg = toAggregates(snap, old, null);
    expect(agg.stale).toBe(true);
  });
});
