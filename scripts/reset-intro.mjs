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

const updated = {
  ...current,
  intro_completed: false,
  aesthetic: {
    ...(current.aesthetic ?? {}),
    palette: ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"],
    style: null,
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
  decisions: (current.decisions ?? []).filter(
    (d) => !String(d.decision).startsWith("Vibe set:")
  ),
};

const { error: writeErr } = await supabase
  .from("wedding_state")
  .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });

if (writeErr) {
  console.error("Failed to update wedding_state:", writeErr.message);
  process.exit(1);
}

const { error: deleteErr, count } = await supabase
  .from("messages")
  .delete({ count: "exact" })
  .is("thread_key", null);

if (deleteErr) {
  console.error("Failed to clear main chat messages:", deleteErr.message);
  process.exit(1);
}

console.log("Intro reset complete.");
console.log("- intro_completed: false");
console.log("- aesthetic.introCompleted: false");
console.log(`- Cleared ${count ?? 0} main-thread message(s)`);
console.log("Open http://localhost:3000/ — redirects to /chat for Beat 1 while intro is incomplete.");
console.log("After vibe intro completes, / shows planning home; welcome overlay if intro_completed is still false.");
