import { describe, it, expect } from "vitest";
import {
  buildMailtoUrl,
  canUseMailto,
  formatToDisplay,
} from "@/lib/vendor-email";

describe("buildMailtoUrl", () => {
  it("encodes subject and body with standard URI encoding", () => {
    const url = buildMailtoUrl({
      to: "hello@lenslight.com",
      subject: "Spring 2027 inquiry",
      body: "Hi Maria,\n\nI hope you're well.",
    });
    expect(url).toBe(
      "mailto:hello@lenslight.com?subject=Spring+2027+inquiry&body=Hi+Maria%2C%0A%0AI+hope+you%27re+well."
    );
  });

  it("handles special characters in subject and body", () => {
    const url = buildMailtoUrl({
      to: "a@b.com",
      subject: 'Quote follow-up — "packages"',
      body: "Line 1 & line 2",
    });
    expect(url).toBe(
      'mailto:a@b.com?subject=Quote+follow-up+%E2%80%94+%22packages%22&body=Line+1+%26+line+2'
    );
  });
});

describe("canUseMailto", () => {
  it("returns true for a short draft", () => {
    expect(
      canUseMailto({
        to: "hello@example.com",
        subject: "Hi",
        body: "Short body.",
      })
    ).toBe(true);
  });

  it("returns false when the encoded URL exceeds the default limit", () => {
    const longBody = "x".repeat(2000);
    expect(
      canUseMailto({
        to: "hello@example.com",
        subject: "Long draft",
        body: longBody,
      })
    ).toBe(false);
  });

  it("respects a custom maxLength", () => {
    const opts = { to: "a@b.com", subject: "S", body: "body" };
    const url = buildMailtoUrl(opts);
    expect(canUseMailto(opts, url.length)).toBe(true);
    expect(canUseMailto(opts, url.length - 1)).toBe(false);
  });
});

describe("formatToDisplay", () => {
  it("shows name and email when toName is present", () => {
    expect(formatToDisplay("maria@studio.com", "Maria Chen")).toBe(
      "Maria Chen <maria@studio.com>"
    );
  });

  it("shows email only when toName is null or blank", () => {
    expect(formatToDisplay("maria@studio.com", null)).toBe("maria@studio.com");
    expect(formatToDisplay("maria@studio.com", "  ")).toBe("maria@studio.com");
  });
});
