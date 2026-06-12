import type { ZolaSnapshot } from "@/lib/types";

/**
 * Raw shapes from the Zola mobile API. Only the fields we read are typed; the
 * rest are ignored. Defensive throughout — Zola can change response shapes.
 */
export interface RawZolaEvent {
  name?: string;
  /**
   * Zola event type. Real values are UPPERCASE, e.g. "WEDDING" /
   * "REHEARSAL_DINNER" (matched case-insensitively below).
   */
  type?: string;
  num_guests_attending?: number;
  num_guests_declined?: number;
  num_guests_not_responded?: number;
  /**
   * Menu definitions for the event (each option has a `name` but NO per-option
   * selection tally). Real meal-choice counts live on individual guest RSVPs,
   * which we deliberately do not pull (PII / aggregate-only). So we only emit a
   * meal choice when a count field is actually present — never a fabricated 0.
   */
  meal_options?: unknown[];
}

/** Event types that represent the main wedding day (for headline selection). */
const MAIN_EVENT_TYPE = /wedding|reception|ceremony/i;

export interface RawZolaGiftTracker {
  total_gifts_received?: number;
  total_gift_value?: number;
  gifts_available_to_send?: number;
  gifts?: Array<{ thank_you_note_status?: string | null }>;
}

export interface RawZolaBudget {
  budgeted_cents?: number;
  cost_cents?: number;
  paid_cents?: number;
  taxonomy_nodes?: Array<{ items?: unknown[] }>;
}

export interface NormalizeInput {
  events: RawZolaEvent[];
  giftTracker: RawZolaGiftTracker | null;
  budget: RawZolaBudget | null;
  syncedAt: string;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Pull a human label + count from an unknown meal-option object shape. */
function readMealOption(option: unknown): { label: string; count: number } | null {
  if (!option || typeof option !== "object") return null;
  const o = option as Record<string, unknown>;
  const label =
    (typeof o.name === "string" && o.name) ||
    (typeof o.title === "string" && o.title) ||
    (typeof o.meal_name === "string" && o.meal_name) ||
    (typeof o.label === "string" && o.label) ||
    null;
  if (!label) return null;
  // Only treat this as a selection tally when a count field is actually
  // present. Zola's `meal_options` are menu definitions (name only), so without
  // this guard we'd fabricate "<entrée>: 0" and mislead the caterer prompt.
  const rawCount =
    o.count ?? o.num_guests ?? o.quantity ?? o.guest_count ?? o.num_guests_selected;
  if (rawCount == null) return null;
  return { label, count: num(rawCount) };
}

function isThankYouPending(status: string | null | undefined): boolean {
  if (!status) return false;
  return !/sent|complete|done|thanked/i.test(status);
}

export function normalizeSnapshot(input: NormalizeInput): ZolaSnapshot {
  const mapped = input.events.map((e) => ({
    raw: e,
    name: typeof e.name === "string" ? e.name : "Event",
    attending: num(e.num_guests_attending),
    declined: num(e.num_guests_declined),
    pending: num(e.num_guests_not_responded),
    isMain: MAIN_EVENT_TYPE.test(
      `${e.type ?? ""} ${typeof e.name === "string" ? e.name : ""}`
    ),
  }));

  // Headline = the main wedding/reception event identified by its type, else
  // the event with the most guests. Null (zeros) when no events exist yet.
  const headline = mapped.reduce<(typeof mapped)[number] | null>((best, e) => {
    if (!best) return e;
    if (e.isMain !== best.isMain) return e.isMain ? e : best;
    const total = e.attending + e.declined + e.pending;
    const bestTotal = best.attending + best.declined + best.pending;
    return total > bestTotal ? e : best;
  }, null);

  const summary = {
    invited: headline
      ? headline.attending + headline.declined + headline.pending
      : 0,
    attending: headline?.attending ?? 0,
    declined: headline?.declined ?? 0,
    pending: headline?.pending ?? 0,
    households: 0,
  };

  // Meal choices from the headline (catering-relevant) event only.
  const choices: Record<string, number> = {};
  for (const option of headline?.raw.meal_options ?? []) {
    const parsed = readMealOption(option);
    if (parsed) choices[parsed.label] = (choices[parsed.label] ?? 0) + parsed.count;
  }
  const meals = Object.keys(choices).length > 0 ? { choices } : undefined;

  const events = mapped.map(({ name, attending, declined, pending }) => ({
    name,
    attending,
    declined,
    pending,
  }));

  let registry: ZolaSnapshot["registry"];
  if (input.giftTracker) {
    const giftsReceived = num(input.giftTracker.total_gifts_received);
    const thankYouPending = (input.giftTracker.gifts ?? []).filter((g) =>
      isThankYouPending(g.thank_you_note_status)
    ).length;
    registry = {
      giftsReceived,
      thankYouPending,
      ...(input.giftTracker.total_gift_value != null
        ? { fundsReceived: num(input.giftTracker.total_gift_value) }
        : {}),
    };
  }

  let budget: ZolaSnapshot["budget"];
  if (input.budget) {
    budget = {
      plannedTotal: Math.round(num(input.budget.budgeted_cents) / 100),
      spentTotal: Math.round(num(input.budget.cost_cents) / 100),
      categoryCount: (input.budget.taxonomy_nodes ?? []).length,
    };
  }

  return {
    summary,
    events: events.length > 0 ? events : undefined,
    meals,
    registry,
    budget,
    syncedAt: input.syncedAt,
  };
}

/** Public, PII-free aggregate shape returned to the client / home card. */
export interface ZolaAggregates {
  available: boolean;
  profileUrl: string | null;
  syncedAt: string | null;
  stale: boolean;
  rsvp: { attending: number; pending: number; declined: number } | null;
  registry: { giftsReceived: number; thankYouPending: number } | null;
}

export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export function toAggregates(
  snapshot: ZolaSnapshot | null,
  importedAt: string | null,
  profileUrl: string | null
): ZolaAggregates {
  if (!snapshot || !importedAt) {
    return {
      available: false,
      profileUrl,
      syncedAt: null,
      stale: false,
      rsvp: null,
      registry: null,
    };
  }
  const stale = Date.now() - new Date(importedAt).getTime() > STALE_AFTER_MS;
  return {
    available: true,
    profileUrl,
    syncedAt: importedAt,
    stale,
    rsvp: {
      attending: snapshot.summary.attending,
      pending: snapshot.summary.pending,
      declined: snapshot.summary.declined,
    },
    registry: snapshot.registry
      ? {
          giftsReceived: snapshot.registry.giftsReceived,
          thankYouPending: snapshot.registry.thankYouPending,
        }
      : null,
  };
}
