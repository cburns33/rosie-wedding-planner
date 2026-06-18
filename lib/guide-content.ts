export type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  bulletsStyle?: "flower" | "dash" | "numbered";
  chips?: string[];
  callout?: { body: string };
  link?: { href: string; label: string };
};

export const GUIDE_LEAD =
  "Rosie is your wedding planner in one place — you talk to her like you'd text a friend who actually knows weddings, and she keeps track of your vibe, vendors, budget, and decisions so you always know what's next.";

export const GUIDE_PAGE_TITLE = "Everything in one place";

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "first-visit",
    title: "Your first visit",
    paragraphs: [
      "The first time you open Rosie, you'll start in chat — not the dashboard. Rosie walks you through a short vibe conversation so your planning home reflects you.",
    ],
    bullets: [
      "Picture a wedding moment that stuck with you — a feeling, a detail, the way the space felt",
      "Share what you'd borrow from other weddings and what would feel wrong copied over",
      "Pick two starting colors, then build your full palette in Coolors (she'll walk you through it)",
      "When you're done, she takes you to your planning home",
    ],
    bulletsStyle: "numbered",
  },
  {
    id: "planning-home",
    title: "Planning home",
    paragraphs: ["Home is your dashboard — the place to see where things stand at a glance."],
    bullets: [
      "Countdown — weeks until your wedding once the date is set",
      "Your vibe — the aesthetic you described, including your colors",
      "Up next — one clear suggestion for where to focus, with a button to jump in",
      "Progress — milestones like venue booked and vendors lined up",
      "Summary cards — guests and RSVPs, inspiration you've saved, vendors booked, your latest decision",
      "The details — budget, venue, vendor list, and decision log",
    ],
    bulletsStyle: "flower",
  },
  {
    id: "ask-rosie",
    title: "Ask Rosie",
    paragraphs: [
      "Ask Rosie is your main conversation — for venue ideas, budget tradeoffs, whether a quote is reasonable, timeline questions, or anything else on your mind.",
    ],
    bullets: [
      "She remembers what you tell her across sessions",
      "One question at a time — she won't overwhelm you",
      "When she has ideas, she offers up to three at a time (more if you want)",
      "She quietly keeps your plan updated as you talk — you don't manage a spreadsheet",
      "When you're ready to email a vendor, she drafts it for you to copy or open in your mail app — you send it yourself",
    ],
    bulletsStyle: "flower",
  },
  {
    id: "vendor-focuses",
    title: "Vendor focuses",
    paragraphs: [
      "For the big booking categories, Rosie has dedicated chats so you can go deep without losing context. Open one from Home, Up next, or when Rosie suggests it in chat.",
      "Facts still save to your overall plan no matter which focus you're in — mention the florist while you're in your caterer focus and she still notes it.",
    ],
    chips: [
      "Photographer",
      "Videographer",
      "Caterer",
      "Florist",
      "DJ",
      "Officiant",
      "Cake",
      "Hair & makeup",
      "Transportation",
    ],
  },
  {
    id: "visual-inspo",
    title: "Visual Inspo Depot",
    paragraphs: [
      "A dedicated chat for mood boards and screenshots — Pinterest saves, venue photos, florals, whatever you're collecting. Rosie turns what you share into organized notes she can reference later.",
    ],
    link: { href: "/chat/inspiration", label: "Open Visual Inspo Depot" },
  },
  {
    id: "zola",
    title: "Zola",
    paragraphs: [
      "Your Zola guest list and registry feed into Rosie in the background. On Home you'll see RSVP totals — attending, waiting on replies, declined — plus registry gift counts.",
    ],
    callout: {
      body: "For anything name-by-name — who hasn't replied, adding a guest, sending invites — you'll still use Zola directly. Rosie sees the numbers, not your full guest list. You don't need to configure anything on your end.",
    },
  },
  {
    id: "what-rosie-knows",
    title: "What Rosie already knows",
    paragraphs: [
      "She starts with a few basics — budget, guest count, timeline, location, music preferences. All of it updates when you tell her something different. You're never locked in.",
    ],
    chips: [
      "~$75,000 budget",
      "250–300 guests",
      "Spring 2027",
      "Southeast / central Texas",
      "DJ (not a full live band)",
    ],
  },
  {
    id: "what-it-isnt",
    title: "What it isn't",
    paragraphs: ["Rosie is here to help you think and stay organized — not to replace the tools you already use."],
    bullets: [
      "Not a replacement for Zola — invites, RSVPs, and the registry stay there",
      "Not sending emails or booking vendors for you",
      "Not a project-management board — it's conversational, with a clean summary on Home",
    ],
    bulletsStyle: "flower",
  },
];
