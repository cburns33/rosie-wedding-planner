import type { WeddingState } from "./types";

export const DEFAULT_WEDDING_STATE: WeddingState = {
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
  },
  vendors: {
    photographer: { status: "undecided", name: null, notes: null, cost: null },
    videographer: { status: "undecided", name: null, notes: null, cost: null },
    caterer: { status: "undecided", name: null, notes: null, cost: null },
    florist: { status: "undecided", name: null, notes: null, cost: null },
    dj: { status: "undecided", name: null, notes: null, cost: null },
    officiant: { status: "undecided", name: null, notes: null, cost: null },
    cake: { status: "undecided", name: null, notes: null, cost: null },
    hair_makeup: { status: "undecided", name: null, notes: null, cost: null },
    transportation: { status: "undecided", name: null, notes: null, cost: null },
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
};
