export interface VendorContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** A vendor option Kelsie has added to a category's shortlist (not yet the booked winner). */
export interface VendorShortlistEntry {
  name: string;
  location: string;
  url: string;
  priceHint: string | null;
  whyFits: string;
  email: string | null;
  phone: string | null;
  addedAt: string;
}

export interface VendorEntry {
  status: "undecided" | "considering" | "contacted" | "booked";
  name: string | null;
  contact: VendorContact | null;
  notes: string | null;
  quoted_cost: number | null;
  booked_cost: number | null;
  /** Vendors in consideration for this category before one is picked. */
  shortlist: VendorShortlistEntry[];
}

export interface WeddingState {
  intro_completed: boolean;
  budget: {
    total: number;
    allocations: Record<string, number>;
    notes: string[];
  };
  timeline: {
    targetDate: string | null;
    confirmedDate: string | null;
    ceremonyTime: string | null;
  };
  venue: {
    status: "undecided" | "shortlisted" | "booked";
    shortlist: Array<{ name: string; location?: string; notes?: string }>;
    selected: { name: string; location?: string; cost?: number } | null;
  };
  guests: {
    estimated: string;
    finalCount: number | null;
    rsvpAttending: number | null;
    rsvpPending: number | null;
    rsvpDeclined: number | null;
    lastZolaImportAt: string | null;
  };
  vendors: Record<string, VendorEntry>;
  decisions: Array<{ date: string; decision: string }>;
  aesthetic: {
    palette: string[];
    style: string | null;
    music: string | null;
    notes: string[];
    borrow: string[];
    avoid: string[];
    layout: string[];
    inspiration: {
      moment: string | null;
      /** Beat 2 — how she wants it to feel (raw; card uses summarized style). */
      feeling: string | null;
      structural: string | null;
    };
    introCompleted: boolean;
    themeApplied: boolean;
    /** Two hex primaries chosen before Coolors handoff. */
    primaryPicks: string[];
    /** Show inline primary picker until Kelsie confirms two colors. */
    pendingPrimaryPicker: boolean;
    /** Completed user answers in the intro arc (source of truth when messages do not persist). */
    introUserTurns: number;
    /** Beat 8 dashboard handoff still in progress after introCompleted. */
    dashboardHandoffPending: boolean;
    /** Beat 8 dashboard question already shown in chat. */
    dashboardHandoffAsked: boolean;
  };
  location: {
    region: string | null;
    hub: string | null;
    decided: boolean;
    notes: string | null;
  };
  integrations: {
    zola: {
      profileUrl: string | null;
      syncMethod: "none" | "csv" | "api";
      lastSyncAt: string | null;
      apiConnected: boolean;
    };
  };
}

/**
 * Normalized, aggregate-only snapshot of the couple's Zola account. Stored in
 * the `zola_snapshots` table (jsonb `data`). Never holds guest names/addresses.
 */
export interface ZolaSnapshot {
  summary: {
    invited: number;
    attending: number;
    declined: number;
    pending: number;
    households: number;
  };
  events?: Array<{
    name: string;
    attending: number;
    declined: number;
    pending: number;
  }>;
  meals?: {
    /** Aggregate meal-choice counts for caterer focus. */
    choices: Record<string, number>;
    dietaryNotes?: string[];
  };
  registry?: {
    giftsReceived: number;
    thankYouPending: number;
    fundsReceived?: number;
  };
  budget?: {
    plannedTotal: number;
    spentTotal: number;
    categoryCount: number;
  };
  syncedAt: string;
}

/** Inline primary color picker returned on the chat API response. */
export interface PrimaryColorPicker {
  hint?: string;
}

/** Coolors starter link surfaced after primary picks are confirmed. */
export interface CoolorsHandoff {
  url: string;
}

/** Ephemeral vendor email draft returned on the chat API response (not stored in DB). */
export interface EmailDraft {
  vendor: string;
  to: string;
  toName: string | null;
  subject: string;
  body: string;
}

/** A single vendor option Rosie surfaced via web search. */
export interface VendorCandidate {
  name: string;
  location: string;
  url: string;
  priceHint: string | null;
  whyFits: string;
  email: string | null;
  phone: string | null;
}

/** Ephemeral vendor discovery results returned on the chat API response (not stored in DB). */
export interface VendorCandidates {
  vendor: string;
  items: VendorCandidate[];
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  /** NULL/undefined = main "Ask Rosie" thread; otherwise a vendor key. */
  thread_key?: string | null;
}

export interface VendorMemory {
  vendor: string;
  markdown: string;
  updated_at: string;
}
