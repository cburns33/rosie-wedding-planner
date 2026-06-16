/**
 * Quick check: turn 2 should return scripted beat 3 (structural) question.
 * Usage: node scripts/test-intro-script.mjs
 */
const opening = `Hey Kelsie, I'm Rosie, your personal wedding planner agent. First of all, congrats on the engagement!!!

We'll get to your planning home page in a sec. Your answers here will help us build a space that keeps you on track and shows you what's next.

To start, I'd love to get a read on the vibe. Picture a wedding moment that stuck with you, one you went to, or one you saw online. What's happening in that moment?`;

const base = "http://localhost:3000";

async function chat(message, initialMessage) {
  const body = { message };
  if (initialMessage) body.initialMessage = initialMessage;
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, message: data.message ?? "" };
}

const t1 = await chat(
  "Friend's garden cocktail hour — string lights, everyone mingling outside at golden hour.",
  opening
);
console.log("Turn 1 status:", t1.status);
console.log("Turn 1 has feeling Q:", /what felt right/i.test(t1.message));

const t2 = await chat(
  "Relaxed and warm. Intimate without being stuffy — like everyone was actually having fun."
);
console.log("Turn 2 status:", t2.status);
console.log("Turn 2 has structural Q:", /venue, layout, dinner format/i.test(t2.message));
console.log("Turn 2 re-asks feeling:", /what made it feel|what got you|what felt right/i.test(t2.message));
console.log("Turn 2 preview:", t2.message.slice(0, 280));
