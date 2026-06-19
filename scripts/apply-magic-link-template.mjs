/**
 * Apply PKCE-safe magic link + confirm-signup email templates via Supabase Management API.
 * Uses token_hash so /auth/callback can verifyOtp server-side (works when the email
 * opens in Mail/Safari instead of the browser where the link was requested).
 *
 * Usage: node scripts/apply-magic-link-template.mjs
 *
 * Requires in .env.local:
 *   SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)
 *   SUPABASE_URL or project ref in PROJECT.md (kmyegwklllfjgoxpnuep)
 */
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
const token = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const projectRef =
  env.SUPABASE_PROJECT_REF ||
  supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  "kmyegwklllfjgoxpnuep";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  console.error("Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const templates = JSON.parse(
  readFileSync(resolve(process.cwd(), "scripts/supabase-magic-link-template.json"), "utf8")
);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(templates),
  }
);

const body = await res.text();
if (!res.ok) {
  console.error("Failed to update auth email templates:", res.status, body);
  process.exit(1);
}

console.log("Supabase auth email templates updated for project:", projectRef);
console.log("- Magic Link: token_hash → /auth/callback?type=email");
console.log("- Confirm signup: token_hash → /auth/callback?type=signup");
console.log("");
console.log("Have Kelsie request a fresh sign-in link (old links are one-time use).");
