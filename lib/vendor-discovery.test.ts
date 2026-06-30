import { describe, it, expect } from "vitest";
import { sanitizeCandidates, formatCandidateNote } from "./vendor-discovery";

describe("sanitizeCandidates", () => {
  it("caps to 4 candidates", () => {
    const raw = Array.from({ length: 6 }, (_, i) => ({
      name: `Vendor ${i}`,
      location: "Houston, TX",
      url: `https://vendor${i}.com`,
      whyFits: "Fits the vibe.",
    }));
    expect(sanitizeCandidates(raw)).toHaveLength(4);
  });

  it("drops candidates without a name or url", () => {
    const raw = [
      { location: "Houston, TX", url: "https://a.com", whyFits: "x" },
      { name: "Vendor B", location: "Houston, TX", whyFits: "x" },
      { name: "Vendor C", location: "Houston, TX", url: "https://c.com", whyFits: "x" },
    ];
    const result = sanitizeCandidates(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Vendor C");
  });

  it("drops candidates with a non-http(s) url", () => {
    const raw = [
      { name: "Vendor A", location: "Houston, TX", url: "javascript:alert(1)", whyFits: "x" },
      { name: "Vendor B", location: "Houston, TX", url: "not a url", whyFits: "x" },
      { name: "Vendor C", location: "Houston, TX", url: "https://c.com", whyFits: "x" },
    ];
    const result = sanitizeCandidates(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Vendor C");
  });

  it("strips empty optional fields to null", () => {
    const raw = [
      {
        name: "Vendor A",
        location: "Houston, TX",
        url: "https://a.com",
        whyFits: "x",
        priceHint: "",
        email: "",
        phone: "",
      },
    ];
    const result = sanitizeCandidates(raw);
    expect(result[0].priceHint).toBeNull();
    expect(result[0].email).toBeNull();
    expect(result[0].phone).toBeNull();
  });

  it("keeps a found email/phone", () => {
    const raw = [
      {
        name: "Vendor A",
        location: "Houston, TX",
        url: "https://a.com",
        whyFits: "x",
        email: "hello@vendora.com",
        phone: "555-1234",
      },
    ];
    const result = sanitizeCandidates(raw);
    expect(result[0].email).toBe("hello@vendora.com");
    expect(result[0].phone).toBe("555-1234");
  });

  it("returns empty array for non-array input", () => {
    expect(sanitizeCandidates(null)).toEqual([]);
    expect(sanitizeCandidates(undefined)).toEqual([]);
    expect(sanitizeCandidates("not an array")).toEqual([]);
  });
});

describe("formatCandidateNote", () => {
  it("formats location, whyFits, and url", () => {
    const note = formatCandidateNote({
      location: "Tomball, TX",
      whyFits: "Bright, classy florals that fit her budget.",
      url: "https://example.com",
    });
    expect(note).toBe(
      "Tomball, TX — Bright, classy florals that fit her budget. (https://example.com)"
    );
  });

  it("omits empty location", () => {
    const note = formatCandidateNote({
      location: "",
      whyFits: "Fits the vibe.",
      url: "https://example.com",
    });
    expect(note).toBe("Fits the vibe. (https://example.com)");
  });
});
