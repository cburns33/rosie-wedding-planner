/**
 * Backfill polished Your vibe display fields from existing intro answers.
 * Usage: node scripts/backfill-vibe-display.mjs
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

function trimWords(text, maxWords) {
  return text.trim().split(/\s+/).slice(0, maxWords).join(" ");
}

function normalizeVibePhrase(text) {
  let s = text
    .trim()
    .replace(/^borrow[:\s]*/i, "")
    .replace(/^and\s+/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
  if (s.length > 32) s = trimWords(s, 4);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function summarizeFeelingPhrase(text) {
  if (!text?.trim()) return null;
  let s = text.trim().split(/[.!?]/)[0]?.trim() ?? text.trim();
  s = s.split(/\s+(without|like|when|where|because)\b/i)[0]?.trim() ?? s;
  s = s.replace(/\s+and\s+/gi, " & ");
  if (s.length > 44) s = trimWords(s, 5);
  return s || null;
}

function finalizeVibeDisplayFields(aesthetic) {
  const borrow = (aesthetic.borrow ?? []).map(normalizeVibePhrase).filter(Boolean);
  const avoid = (aesthetic.avoid ?? []).map(normalizeVibePhrase).filter(Boolean);
  const style =
    summarizeFeelingPhrase(aesthetic.inspiration?.feeling) ??
    summarizeFeelingPhrase(aesthetic.style);
  return { style, borrow: borrow.slice(0, 4), avoid: avoid.slice(0, 3) };
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
const aesthetic = current.aesthetic ?? {};

if (
  !aesthetic.inspiration?.feeling &&
  aesthetic.style &&
  /relaxed|warm|intimate|feeling|vibe/i.test(aesthetic.style)
) {
  aesthetic.inspiration = {
    moment: aesthetic.inspiration?.moment ?? null,
    feeling: aesthetic.style,
    structural: aesthetic.inspiration?.structural ?? null,
  };
}

const display = finalizeVibeDisplayFields(aesthetic);

const updated = {
  ...current,
  aesthetic: {
    ...aesthetic,
    style: display.style,
    borrow: display.borrow.length ? display.borrow : aesthetic.borrow ?? [],
    avoid: display.avoid.length ? display.avoid : aesthetic.avoid ?? [],
  },
};

const { error: writeErr } = await supabase
  .from("wedding_state")
  .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });

if (writeErr) {
  console.error("Failed to update wedding_state:", writeErr.message);
  process.exit(1);
}

console.log("Vibe display backfill complete.");
console.log("- style:", display.style);
console.log("- borrow:", display.borrow.join(", "));
console.log("- avoid:", display.avoid.join(", "));
console.log("Hard refresh http://localhost:3000/ to see the updated card.");
