/**
 * Seed Boxwood Manor as the chosen venue + bootstrap inspo open threads.
 * Usage: node scripts/seed-boxwood-venue.mjs
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
const today = new Date().toISOString().slice(0, 10);
const decisions = Array.isArray(current.decisions) ? [...current.decisions] : [];
const alreadyLogged = decisions.some((d) =>
  String(d.decision ?? "").toLowerCase().includes("boxwood")
);

if (!alreadyLogged) {
  decisions.push({
    date: today,
    decision: "Venue: Boxwood Manor (Tomball, TX)",
  });
}

const updated = {
  ...current,
  venue: {
    ...(current.venue ?? {}),
    status: "booked",
    selected: {
      name: "Boxwood Manor",
      location: "Tomball, TX (Houston area)",
    },
    shortlist: [],
  },
  location: {
    ...(current.location ?? {}),
    region: "southeast/central Texas",
    hub: "Houston",
    decided: true,
    notes: "Boxwood Manor — Tomball, TX. https://www.boxwoodmanorevents.com/",
  },
  decisions,
};

const { error: writeErr } = await supabase
  .from("wedding_state")
  .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });

if (writeErr) {
  console.error("Failed to update wedding_state:", writeErr.message);
  process.exit(1);
}

const inspoBootstrap = `## What she's drawn to
(To be filled in as she shares screenshots in Visual Inspo Depot.)

## Observations

## Tags
pre-proposal research

## Open threads
- Kelsie has been casually wedding planning before the proposal (Chase, ${today}): wedding dresses and bridesmaid dresses are confirmed interests; other saved inspo likely exists in personal bookmarks or Pinterest.
- After the proposal, invite her to drop dress screenshots and anything else she's saved here so Rosie can reference her taste across vendors and décor.`;

const { data: inspoRow } = await supabase
  .from("inspiration_memory")
  .select("markdown")
  .eq("id", 1)
  .single();

const existingInspo = (inspoRow?.markdown ?? "").trim();
if (!existingInspo) {
  const { error: inspoErr } = await supabase
    .from("inspiration_memory")
    .upsert({
      id: 1,
      markdown: inspoBootstrap,
      updated_at: new Date().toISOString(),
    });

  if (inspoErr) {
    console.error("Failed to seed inspiration_memory:", inspoErr.message);
    process.exit(1);
  }
  console.log("- inspiration_memory: bootstrapped open threads (dresses, pre-proposal research)");
} else {
  console.log("- inspiration_memory: left unchanged (already has content)");
}

console.log("Boxwood Manor seeded.");
console.log("- venue.status: booked");
console.log("- venue.selected: Boxwood Manor, Tomball TX");
console.log("- location.decided: true");
