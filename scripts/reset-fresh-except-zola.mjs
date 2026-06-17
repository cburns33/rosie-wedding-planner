import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: row, error: readErr } = await supabase
  .from("wedding_state")
  .select("data")
  .eq("id", 1)
  .single();

if (readErr) {
  console.error("Failed to read wedding_state:", readErr.message);
  process.exit(1);
}

const current = row.data ?? {};

const preservedGuests = {
  estimated: current.guests?.estimated ?? "250-300",
  finalCount: current.guests?.finalCount ?? null,
  rsvpAttending: current.guests?.rsvpAttending ?? null,
  rsvpPending: current.guests?.rsvpPending ?? null,
  rsvpDeclined: current.guests?.rsvpDeclined ?? null,
  lastZolaImportAt: current.guests?.lastZolaImportAt ?? null,
};

const preservedZola = current.integrations?.zola ?? {
  profileUrl: null,
  syncMethod: "none",
  lastSyncAt: null,
  apiConnected: false,
};

const updated = {
  intro_completed: false,
  budget: { total: 75000, allocations: {}, notes: [] },
  timeline: {
    targetDate: "spring 2027",
    confirmedDate: null,
    ceremonyTime: null,
  },
  venue: { status: "undecided", shortlist: [], selected: null },
  guests: preservedGuests,
  vendors: {
    photographer: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    videographer: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    caterer: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    florist: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    dj: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    officiant: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    cake: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    hair_makeup: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
    transportation: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
    },
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
    inspiration: { moment: null, feeling: null, structural: null },
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
  integrations: { zola: preservedZola },
};

const { error: writeErr } = await supabase
  .from("wedding_state")
  .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });

if (writeErr) {
  console.error("Failed to update wedding_state:", writeErr.message);
  process.exit(1);
}

const { error: msgErr, count: msgCount } = await supabase
  .from("messages")
  .delete({ count: "exact" })
  .not("id", "is", null);

if (msgErr) {
  console.error("Failed to clear messages:", msgErr.message);
  process.exit(1);
}

const { error: inspErr } = await supabase
  .from("inspiration_memory")
  .upsert({ id: 1, markdown: "", updated_at: new Date().toISOString() });

if (inspErr) {
  console.error("Failed to clear inspiration_memory:", inspErr.message);
  process.exit(1);
}

const { error: vendorMemErr, count: vendorMemCount } = await supabase
  .from("vendor_memory")
  .delete({ count: "exact" })
  .not("vendor", "is", null);

if (vendorMemErr) {
  console.error("Failed to clear vendor_memory:", vendorMemErr.message);
  process.exit(1);
}

console.log("Fresh reset complete (Zola data preserved).");
console.log("- wedding_state reset to defaults except guests RSVP + integrations.zola");
console.log(`- Cleared ${msgCount ?? 0} message(s) (all threads)`);
console.log("- Cleared inspiration_memory");
console.log(`- Cleared ${vendorMemCount ?? 0} vendor_memory row(s)`);
console.log("- zola_snapshots table untouched");
console.log(
  `Preserved Zola guests: finalCount=${preservedGuests.finalCount}, attending=${preservedGuests.rsvpAttending}, pending=${preservedGuests.rsvpPending}, declined=${preservedGuests.rsvpDeclined}`
);
console.log("Open http://localhost:3000/ — redirects to /chat for Beat 1.");
