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
const base = process.env.CHAT_URL || "http://localhost:3000";

const opening = `Hey Kelsie, I'm Rosie, your personal wedding planner agent. First of all, congrats on the engagement!!!

We'll get to your planning home page in a sec. Your answers here will help us build a space that keeps you on track and shows you what's next.

To start, I'd love to get a read on the vibe. Picture a wedding moment that stuck with you, one you went to, or one you saw online. What's happening in that moment?`;

const body = {
  message:
    "Friend's garden cocktail hour — string lights, everyone mingling outside at golden hour.",
  initialMessage: opening,
};

const res = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log("status", res.status);
const data = await res.json();
console.log("message length", data.message?.length ?? 0);
console.log("message preview", JSON.stringify(data.message?.slice(0, 200)));
console.log("keys", Object.keys(data));
