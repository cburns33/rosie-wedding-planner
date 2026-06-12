export interface VendorContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface VendorEntry {
  status: "undecided" | "considering" | "contacted" | "booked";
  name: string | null;
  contact: VendorContact | null;
  notes: string | null;
  quoted_cost: number | null;
  booked_cost: number | null;
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

/** Ephemeral vendor email draft returned on the chat API response (not stored in DB). */
export interface EmailDraft {
  vendor: string;
  to: string;
  toName: string | null;
  subject: string;
  body: string;
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
