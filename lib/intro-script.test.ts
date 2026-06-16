import { describe, it, expect } from "vitest";
import {
  composeScriptedIntroReply,
  getIntroBeatQuestion,
  isScriptedIntroBeat,
  parseBorrowAvoid,
} from "@/lib/intro-script";

describe("intro script", () => {
  it("marks beats 2–5a as scripted", () => {
    expect(isScriptedIntroBeat("2")).toBe(true);
    expect(isScriptedIntroBeat("3")).toBe(true);
    expect(isScriptedIntroBeat("5a")).toBe(true);
    expect(isScriptedIntroBeat("7")).toBe(false);
  });

  it("returns fixed beat 3 structural question", () => {
    const q = getIntroBeatQuestion("3");
    expect(q).toContain("venue, layout, dinner format");
    expect(q).not.toContain("what felt right");
  });

  it("composes reflect + question without duplicating feeling asks on beat 3", () => {
    const reply = composeScriptedIntroReply(
      "Relaxed and warm — I love that.",
      "3"
    );
    expect(reply).toContain("Relaxed and warm");
    expect(reply).toContain("Separate question");
  });

  it("parses borrow and avoid from turn 4 style answer", () => {
    const { borrow, avoid } = parseBorrowAvoid(
      "Borrow long tables, outdoor ceremony, and candlelit warmth. Avoid church formality and heavy rustic decor."
    );
    expect(borrow.some((b) => /long table/i.test(b))).toBe(true);
    expect(avoid.some((a) => /formality/i.test(a))).toBe(true);
  });
});
