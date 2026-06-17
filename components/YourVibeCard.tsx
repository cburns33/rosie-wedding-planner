import Link from "next/link";
import type { WeddingState } from "@/lib/types";
import { getYourVibePresentation } from "@/lib/vibe-display";

interface YourVibeCardProps {
  aesthetic: WeddingState["aesthetic"];
}

function hasVibeContent(aesthetic: WeddingState["aesthetic"] | undefined): boolean {
  if (!aesthetic) return false;

  const inspiration = aesthetic.inspiration;
  return (
    aesthetic.introCompleted ||
    Boolean(aesthetic.style) ||
    Boolean(inspiration?.feeling) ||
    Boolean(inspiration?.moment) ||
    Boolean(inspiration?.structural) ||
    (Array.isArray(aesthetic.borrow) && aesthetic.borrow.length > 0) ||
    (Array.isArray(aesthetic.avoid) && aesthetic.avoid.length > 0) ||
    (Array.isArray(aesthetic.palette) &&
      aesthetic.palette.some((c) => typeof c === "string" && c.startsWith("#")))
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs tracking-[0.15em] uppercase text-warm-light">
      {children}
    </p>
  );
}

export default function YourVibeCard({ aesthetic }: YourVibeCardProps) {
  if (!hasVibeContent(aesthetic)) return null;

  const { headline, momentLine, inspiredBy, details = [], avoid = [] } =
    getYourVibePresentation(aesthetic);
  const swatches = (Array.isArray(aesthetic.palette) ? aesthetic.palette : [])
    .filter((c) => typeof c === "string" && c.startsWith("#"))
    .slice(0, 5);

  return (
    <section className="briefing-item space-y-3" style={{ animationDelay: "50ms" }}>
      <h2 className="text-xs tracking-[0.2em] uppercase text-warm-light">
        Your vibe
      </h2>
      <div className="rounded-2xl border border-border bg-white p-6 sm:p-7 space-y-4">
        {headline && (
          <p className="font-serif text-2xl font-light text-warm-dark text-balance">
            {headline}
          </p>
        )}

        {momentLine && (
          <p className="text-sm text-warm-light leading-relaxed text-pretty max-w-prose">
            {momentLine}
          </p>
        )}

        {inspiredBy && (
          <div className="space-y-1.5">
            <SectionLabel>Inspired by</SectionLabel>
            <p className="text-sm text-warm-mid leading-relaxed text-pretty max-w-prose">
              {inspiredBy}
            </p>
          </div>
        )}

        {details.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Details</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {details.map((item) => (
                <span
                  key={item}
                  className="text-xs px-3 py-1.5 rounded-full bg-blush-pale text-warm-dark border border-blush/15"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {swatches.length > 0 && (
          <div className="flex gap-2 pt-1">
            {swatches.map((color, i) => (
              <span
                key={i}
                className="w-8 h-8 rounded-full shrink-0 outline outline-1 outline-black/10"
                style={{ backgroundColor: color }}
                aria-label={`Palette color ${i + 1}`}
              />
            ))}
          </div>
        )}

        {avoid.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Skipping</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {avoid.map((item) => (
                <span
                  key={item}
                  className="text-xs px-3 py-1.5 rounded-full bg-cream text-warm-light border border-border"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/chat"
          className="inline-flex text-xs text-blush hover:underline"
        >
          Refine
        </Link>
      </div>
    </section>
  );
}

export { hasVibeContent };
