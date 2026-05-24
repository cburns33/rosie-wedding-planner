export interface VendorEntry {
  status: "undecided" | "considering" | "contacted" | "booked";
  name: string | null;
  notes: string | null;
  cost: number | null;
}

export interface WeddingState {
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
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
