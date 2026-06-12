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
    palette: ["pink", "green", "blue"],
    style: "elevated classic",
    music: "DJ with potential live instrument",
    notes: [],
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
