/**
 * Reset for Kelsie's first real session: fresh intro arc, preserved venue + Zola + inspo bootstrap.
 * Usage: node scripts/prepare-handoff.mjs
 */
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

const preservedVenue = current.venue ?? {
  status: "booked",
  selected: { name: "Boxwood Manor", location: "Tomball, TX (Houston area)" },
  shortlist: [],
};

const preservedLocation = current.location ?? {
  region: "southeast/central Texas",
  hub: "Houston",
  decided: true,
  notes: "Boxwood Manor — Tomball, TX. https://www.boxwoodmanorevents.com/",
};

const preservedGuests = current.guests ?? {};
const preservedZola = current.integrations?.zola ?? {
  profileUrl: null,
  syncMethod: "none",
  lastSyncAt: null,
  apiConnected: false,
};

const preservedDecisions = (current.decisions ?? []).filter(
  (d) =>
    !String(d.decision ?? "").startsWith("Vibe set:") &&
    String(d.decision ?? "").toLowerCase().includes("boxwood")
);

const updated = {
  ...current,
  intro_completed: false,
  venue: preservedVenue,
  location: preservedLocation,
  guests: preservedGuests,
  integrations: { zola: preservedZola },
  decisions: preservedDecisions,
  aesthetic: {
    palette: ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"],
    style: null,
    music: current.aesthetic?.music ?? "DJ with potential live instrument",
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
  .gte("id", 0);

if (msgErr) {
  console.error("Failed to clear messages:", msgErr.message);
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

console.log("Handoff prep complete.");
console.log("- intro_completed: false (welcome overlay will show after vibe arc)");
console.log("- aesthetic.introCompleted: false (landing redirects to /chat Beat 1)");
console.log("- aesthetic.introUserTurns: 0");
console.log(`- venue: ${preservedVenue.selected?.name ?? preservedVenue.status}`);
console.log(`- Cleared ${msgCount ?? 0} message(s) across all threads`);
console.log(`- Cleared ${vendorMemCount ?? 0} vendor_memory row(s)`);
console.log("- Preserved: Zola guests, integrations.zola, inspiration_memory, Boxwood decision");
console.log("");
console.log("Expected first visit:");
console.log("  1. Sign in → / redirects to /chat");
console.log("  2. Beat 1 opening: congrats + vibe question");
console.log("  3. After vibe + colors → / planning home + welcome overlay");
