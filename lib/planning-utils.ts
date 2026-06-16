import type { WeddingState } from "./types";
import { type VendorKey, vendorFocusLabel } from "./vendors";

const VENDOR_LABELS: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  caterer: "Caterer",
  florist: "Florist",
  dj: "DJ",
  officiant: "Officiant",
  cake: "Cake",
  hair_makeup: "Hair & makeup",
  transportation: "Transportation",
};

/** Vendors Rosie tackles first, in order. */
const PRIORITY_VENDORS = ["photographer", "caterer", "florist", "dj"];

const SEASON_MONTH: Record<string, number> = {
  winter: 0, // mid-January
  spring: 3, // mid-April
  summer: 6, // mid-July
  fall: 9, // mid-October
  autumn: 9,
};

/**
 * Resolve a wedding date from confirmed/target fields. Handles a real date
 * string ("2027-05-15") or a loose season phrase ("spring 2027"). Returns null
 * when nothing usable is present.
 */
export function resolveWeddingDate(state: WeddingState): Date | null {
  const { confirmedDate, targetDate } = state.timeline;
  const raw = confirmedDate ?? targetDate;
  if (!raw) return null;

  const exact = new Date(raw);
  if (!Number.isNaN(exact.getTime()) && /\d{4}-\d{2}/.test(raw)) {
    return exact;
  }

  const lower = raw.toLowerCase();
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);

  const season = Object.keys(SEASON_MONTH).find((s) => lower.includes(s));
  const month = season ? SEASON_MONTH[season] : 5; // default mid-year
  return new Date(year, month, 15);
}

/** Whole weeks between now and the wedding (never negative). */
export function weeksToGo(state: WeddingState): number | null {
  const date = resolveWeddingDate(state);
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24 * 7));
}

function parseDecisionDate(date: string): Date | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!isoMatch) return null;
  const parsed = new Date(
    Number(isoMatch[1]),
    Number(isoMatch[2]) - 1,
    Number(isoMatch[3])
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Decision log dates stored as YYYY-MM-DD, shown as "Jun 16". */
export function formatDecisionDate(date: string): string {
  const parsed = parseDecisionDate(date);
  if (parsed) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return date;
}

/** Decision log dates with year, shown as "Jun 16, 2026". */
export function formatDecisionDateWithYear(date: string): string {
  const parsed = parseDecisionDate(date);
  if (parsed) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return date;
}

/** Human label for the date line, falling back to the raw target phrase. */
export function dateLabel(state: WeddingState): string {
  const { confirmedDate, targetDate } = state.timeline;
  if (confirmedDate) {
    const d = new Date(confirmedDate);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return confirmedDate;
  }
  return targetDate ?? "Date to be set";
}

export interface UpNext {
  /** Short focus label, e.g. "Lock in your venue". */
  title: string;
  /** One scannable supporting line. */
  detail: string;
  /** Where the up-next card navigates. */
  href: string;
  /** Primary CTA label on the card. */
  cta: string;
}

/**
 * The single most useful next focus, derived from current state. Order:
 * venue → priority vendors → remaining vendors → guest count → all set.
 */
export function getUpNext(state: WeddingState): UpNext {
  if (state.venue.status !== "booked") {
    const layoutItems = (state.aesthetic.layout ?? []).slice(0, 2);
    const layoutPhrase =
      layoutItems.length > 0
        ? layoutItems.join(" and ")
        : null;

    if (state.venue.shortlist.length > 0) {
      return {
        title: "Choose your venue",
        detail: `You're weighing ${state.venue.shortlist.length} option${
          state.venue.shortlist.length === 1 ? "" : "s"
        }. Rosie can help you decide.`,
        href: "/chat",
        cta: "Compare venues",
      };
    }

    if (layoutPhrase) {
      return {
        title: "Find your venue",
        detail: `You mentioned ${layoutPhrase} — let's find venues that fit.`,
        href: "/chat",
        cta: "Talk about venue",
      };
    }

    return {
      title: "Find your venue",
      detail: "Everything else builds around this. Let's start the shortlist.",
      href: "/chat",
      cta: "Talk about venue",
    };
  }

  const orderedVendors = [
    ...PRIORITY_VENDORS,
    ...Object.keys(state.vendors).filter((k) => !PRIORITY_VENDORS.includes(k)),
  ];

  const nextVendor = orderedVendors.find(
    (key) => state.vendors[key] && state.vendors[key].status !== "booked"
  );

  if (nextVendor) {
    const label = VENDOR_LABELS[nextVendor] ?? nextVendor;
    const status = state.vendors[nextVendor].status;
    const detail =
      status === "considering" || status === "contacted"
        ? `You've started on your ${label.toLowerCase()}. Time to lock it in.`
        : `Rosie can pull three ${label.toLowerCase()} options to compare.`;
    return {
      title: `Book your ${label.toLowerCase()}`,
      detail,
      href: `/chat/${nextVendor}`,
      cta: `Open ${vendorFocusLabel(nextVendor as VendorKey)} focus`,
    };
  }

  if (state.guests.finalCount == null) {
    return {
      title: "Settle the guest list",
      detail: `You're planning for ${state.guests.estimated}. A final count unlocks the rest.`,
      href: "/chat",
      cta: "Ask Rosie",
    };
  }

  return {
    title: "You're in great shape",
    detail: "The big pieces are booked. Ask Rosie what to polish next.",
    href: "/chat",
    cta: "Ask Rosie",
  };
}

export type MilestoneStatus = "done" | "active" | "upcoming";

export interface Milestone {
  label: string;
  status: MilestoneStatus;
  /** Optional progress text, e.g. "2 of 9 booked". */
  note?: string;
  /** Set on the active milestone only. */
  href?: string;
  cta?: string;
}

function milestoneHref(label: string): string {
  if (label === "Vendors") return "#vendors";
  return "/chat";
}

function milestoneCta(label: string): string {
  if (label === "Vendors") return "See vendors";
  if (label === "Venue") return "Talk about venue";
  if (label === "Foundations") return "Continue";
  return "Continue";
}

/** Four-phase planning arc shown as a horizontal progress strip. */
export function getMilestones(state: WeddingState): Milestone[] {
  const vendorKeys = Object.keys(state.vendors);
  const bookedVendors = vendorKeys.filter(
    (k) => state.vendors[k].status === "booked"
  ).length;

  const foundationsDone = state.location.decided && Boolean(state.budget.total);
  const venueDone = state.venue.status === "booked";
  const vendorsDone = vendorKeys.length > 0 && bookedVendors === vendorKeys.length;
  const detailsDone = state.guests.finalCount != null && vendorsDone;

  const raw: Array<{ label: string; done: boolean; note?: string }> = [
    { label: "Foundations", done: foundationsDone },
    { label: "Venue", done: venueDone },
    {
      label: "Vendors",
      done: vendorsDone,
      note: `${bookedVendors} of ${vendorKeys.length} booked`,
    },
    { label: "Final details", done: detailsDone },
  ];

  // First not-done phase is "active"; the rest are "upcoming".
  let activeAssigned = false;
  return raw.map((m): Milestone => {
    if (m.done) return { label: m.label, status: "done", note: m.note };
    if (!activeAssigned) {
      activeAssigned = true;
      return {
        label: m.label,
        status: "active",
        note: m.note,
        href: milestoneHref(m.label),
        cta: milestoneCta(m.label),
      };
    }
    return { label: m.label, status: "upcoming", note: m.note };
  });
}

export interface PlanningSummary {
  bookedVendors: number;
  totalVendors: number;
  allocated: number;
  remaining: number;
  latestDecision: { date: string; decision: string } | null;
}

export function getSummary(state: WeddingState): PlanningSummary {
  const vendorKeys = Object.keys(state.vendors);
  const bookedVendors = vendorKeys.filter(
    (k) => state.vendors[k].status === "booked"
  ).length;
  const allocated = Object.values(state.budget.allocations).reduce(
    (sum, v) => sum + (v ?? 0),
    0
  );
  return {
    bookedVendors,
    totalVendors: vendorKeys.length,
    allocated,
    remaining: state.budget.total - allocated,
    latestDecision:
      state.decisions.length > 0
        ? state.decisions[state.decisions.length - 1]
        : null,
  };
}
