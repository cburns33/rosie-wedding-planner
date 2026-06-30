import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Keep in sync with VENDOR_KEYS / VENDOR_LABELS in lib/vendors.ts
const VENDOR_LABELS = {
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

const vendor = process.argv[2];

if (!vendor || !(vendor in VENDOR_LABELS)) {
  console.error("Usage: node scripts/reset-vendor-focus.mjs <vendor>");
  console.error(`Valid vendors: ${Object.keys(VENDOR_LABELS).join(", ")}`);
  process.exit(1);
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const label = VENDOR_LABELS[vendor].toLowerCase();

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
const priorDecisionCount = (current.decisions ?? []).length;
const remainingDecisions = (current.decisions ?? []).filter(
  (d) => !String(d.decision).toLowerCase().includes(label)
);

const updated = {
  ...current,
  vendors: {
    ...(current.vendors ?? {}),
    [vendor]: {
      status: "undecided",
      name: null,
      contact: null,
      notes: null,
      quoted_cost: null,
      booked_cost: null,
      shortlist: [],
    },
  },
  decisions: remainingDecisions,
};

const { error: writeErr } = await supabase
  .from("wedding_state")
  .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });

if (writeErr) {
  console.error("Failed to update wedding_state:", writeErr.message);
  process.exit(1);
}

const { error: messagesErr, count: messageCount } = await supabase
  .from("messages")
  .delete({ count: "exact" })
  .eq("thread_key", vendor);

if (messagesErr) {
  console.error("Failed to clear vendor messages:", messagesErr.message);
  process.exit(1);
}

const { error: memoryErr } = await supabase
  .from("vendor_memory")
  .delete()
  .eq("vendor", vendor);

if (memoryErr) {
  console.error("Failed to clear vendor memory:", memoryErr.message);
  process.exit(1);
}

console.log(`Reset complete for ${vendor}.`);
console.log(`- vendors.${vendor}: reset to undecided, shortlist cleared`);
console.log(`- Cleared ${priorDecisionCount - remainingDecisions.length} decision(s) mentioning "${label}"`);
console.log(`- Cleared ${messageCount ?? 0} message(s) in the ${vendor} thread`);
console.log(`- Cleared internal vendor_memory for ${vendor}`);
console.log(`Open http://localhost:3000/chat/${vendor} — opens fresh, as if never visited.`);
