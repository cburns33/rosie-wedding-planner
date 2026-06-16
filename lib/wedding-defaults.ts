import type { WeddingState } from "./types";

export const DEFAULT_WEDDING_STATE: WeddingState = {
  intro_completed: false,
  budget: {
    total: 75000,
    allocations: {},
    notes: [],
  },
  timeline: {
    targetDate: "spring 2027",
    confirmedDate: null,
    ceremonyTime: null,
  },
  venue: {
    status: "undecided",
    shortlist: [],
    selected: null,
  },
  guests: {
    estimated: "250–300",
    finalCount: null,
    rsvpAttending: null,
    rsvpPending: null,
    rsvpDeclined: null,
    lastZolaImportAt: null,
  },
  vendors: {
    photographer: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    videographer: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    caterer: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    florist: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    dj: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    officiant: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    cake: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    hair_makeup: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
    transportation: { status: "undecided", name: null, contact: null, notes: null, quoted_cost: null, booked_cost: null },
  },
  decisions: [],
  aesthetic: {
    palette: ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"],
    style: null,
    music: "DJ with potential live instrument",
    notes: [],
    borrow: [],
    avoid: [],
    layout: [],
    inspiration: {
      moment: null,
      feeling: null,
      structural: null,
    },
    introCompleted: false,
    themeApplied: false,
    primaryPicks: [],
    pendingPrimaryPicker: false,
    introUserTurns: 0,
    dashboardHandoffPending: false,
    dashboardHandoffAsked: false,
  },
  location: {
    region: "southeast/central Texas",
    hub: "Houston",
    decided: false,
    notes: null,
  },
  integrations: {
    zola: {
      profileUrl: null,
      syncMethod: "none",
      lastSyncAt: null,
      apiConnected: false,
    },
  },
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Merge partial DB state with defaults (deep-merge aesthetic). */
export function mergeWeddingState(partial?: Partial<WeddingState>): WeddingState {
  const partialAesthetic = partial?.aesthetic ?? {};

  return {
    ...DEFAULT_WEDDING_STATE,
    ...partial,
    decisions: Array.isArray(partial?.decisions)
      ? partial.decisions
      : DEFAULT_WEDDING_STATE.decisions,
    aesthetic: {
      ...DEFAULT_WEDDING_STATE.aesthetic,
      ...partialAesthetic,
      palette: asStringArray(partialAesthetic.palette).length
        ? asStringArray(partialAesthetic.palette)
        : DEFAULT_WEDDING_STATE.aesthetic.palette,
      borrow: asStringArray(partialAesthetic.borrow),
      avoid: asStringArray(partialAesthetic.avoid),
      layout: asStringArray(partialAesthetic.layout),
      notes: asStringArray(partialAesthetic.notes),
      primaryPicks: asStringArray(partialAesthetic.primaryPicks),
      inspiration: {
        ...DEFAULT_WEDDING_STATE.aesthetic.inspiration,
        ...(partialAesthetic.inspiration ?? {}),
      },
    },
  };
}
