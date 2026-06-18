"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import GuideBulletList from "@/components/GuideBulletList";
import GuideFlowerBullet from "@/components/GuideFlowerBullet";
import { GUIDE_SECTIONS, type GuideSection } from "@/lib/guide-content";

type Treatment = "blush" | "sage" | "open";

function getTreatment(section: GuideSection, index: number): Treatment {
  if (section.id === "zola") return "sage";
  return index % 2 === 1 ? "blush" : "open";
}

const CARD_GRADIENT: Record<Treatment, string> = {
  blush:
    "bg-gradient-to-br from-blush-pale to-blush-light shadow-[0_0_0_1px_rgba(201,160,160,0.12),0_8px_48px_rgba(201,160,160,0.12)]",
  sage: "bg-gradient-to-br from-sage-pale to-sage-light shadow-[0_0_0_1px_rgba(143,175,143,0.12),0_8px_48px_rgba(143,175,143,0.10)]",
  open: "",
};

// Cream ring around each circle separates it visually from the spine line
const CIRCLE_RING = "shadow-[0_0_0_5px_rgba(250,248,245,1)]";

function StepCircle({ index, isLast }: { index: number; isLast: boolean }) {
  return (
    <div
      aria-hidden
      // Straddles the section top boundary; z-10 floats above cards
      className={`absolute z-10 top-0 left-8 -translate-x-1/2 -translate-y-1/2 md:left-1/2
                  size-11 rounded-full bg-cream border-2 border-blush/40
                  flex items-center justify-center ${CIRCLE_RING}`}
    >
      {isLast ? (
        <GuideFlowerBullet className="size-4 text-blush" />
      ) : (
        <span className="font-serif text-base text-warm-mid tabular-nums leading-none select-none">
          {index + 1}
        </span>
      )}
    </div>
  );
}

function SectionContent({
  section,
  treatment,
}: {
  section: GuideSection;
  treatment: Treatment;
}) {
  return (
    <>
      <h2 className="font-script text-5xl sm:text-[3.25rem] leading-tight text-warm-dark text-balance mb-5">
        {section.title}
      </h2>

      <div className="space-y-3 mb-5">
        {section.paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm text-warm-mid leading-relaxed text-pretty max-w-prose md:mx-auto"
          >
            {p}
          </p>
        ))}
      </div>

      {section.bullets && (
        <div className="md:inline-block md:text-left">
          <GuideBulletList
            items={section.bullets}
            marker={section.bulletsStyle ?? "flower"}
          />
        </div>
      )}

      {section.chips && (
        <div className="flex flex-wrap gap-2 mt-1 md:justify-center">
          {section.chips.map((chip) => (
            <span
              key={chip}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                treatment === "sage"
                  ? "bg-white/50 text-warm-dark border-sage/20"
                  : "bg-sage-pale text-warm-dark border-sage/15"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {section.callout && (
        <div className="mt-4 rounded-2xl bg-white/50 border border-sage/20 p-5 sm:p-6 text-left">
          <p className="text-sm text-warm-mid leading-relaxed text-pretty">
            {section.callout.body}
          </p>
        </div>
      )}

      {section.link && (
        <div className="mt-4">
          <Link
            href={section.link.href}
            className="text-sm text-blush hover:underline"
          >
            {section.link.label}
          </Link>
        </div>
      )}
    </>
  );
}

function TimelineSection({
  section,
  index,
  isLast,
}: {
  section: GuideSection;
  index: number;
  isLast: boolean;
}) {
  const treatment = getTreatment(section, index);
  const isCard = treatment !== "open";

  return (
    // Sections are transparent — cream bg of wrapper shows through;
    // only the card div has an opaque background that covers the spine
    <section className="relative w-full pt-20 pb-14 md:pt-24 md:pb-20">
      <StepCircle index={index} isLast={isLast} />

      {isCard ? (
        // Card: inset from edges, opaque gradient covers spine in its area
        <div
          data-reveal
          className={`rounded-[2rem] ml-4 mr-4 md:mx-16 lg:mx-20
                      px-8 sm:px-10 md:px-12 py-10 md:py-14
                      ${CARD_GRADIENT[treatment]}`}
        >
          <div className="max-w-2xl mx-auto md:text-center">
            <SectionContent section={section} treatment={treatment} />
          </div>
        </div>
      ) : (
        // Open: content on cream bg, spine fully visible here
        <div
          data-reveal
          className="bg-cream pl-20 pr-4 md:pl-0 md:pr-0 md:max-w-2xl md:mx-auto md:text-center"
        >
          <SectionContent section={section} treatment="open" />
        </div>
      )}
    </section>
  );
}

export default function GuidePageTimeline() {
  const mainRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const spineFillRef = useRef<HTMLDivElement>(null);

  // Spine fill: scaleY driven by scroll (GPU-composited, Tier 1)
  useEffect(() => {
    const fill = spineFillRef.current;
    const wrapper = timelineRef.current;
    if (!fill || !wrapper) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      fill.style.transform = "scaleY(1)";
      return;
    }

    const onScroll = () => {
      const { top, height } = wrapper.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (-top + window.innerHeight * 0.4) / height));
      fill.style.transform = `scaleY(${progress})`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver enter reveals — scoped to this page
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    container.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <main ref={mainRef} className="pt-16">

        {/* Hero — full-bleed blush-pale */}
        <section className="w-full bg-blush-pale">
          <div className="max-w-2xl mx-auto px-6 py-20 md:py-28 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-warm-light mb-3">
              How this works
            </p>
            <h1 className="font-script text-5xl sm:text-[3.5rem] text-warm-dark text-balance mb-5 leading-tight">
              Everything in one place
            </h1>
            <p className="text-sm text-warm-mid leading-relaxed text-pretty max-w-sm mx-auto">
              Rosie is your personal wedding planner. She keeps everything
              straight so you don&apos;t have to.
            </p>
          </div>
        </section>

        {/* Timeline body
            bg-cream on wrapper = page bg showing through transparent sections;
            spine sits at z-0 between the cream and the opaque cards */}
        <div ref={timelineRef} className="relative bg-cream">
          {/* Spine track */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-8 md:left-1/2 w-px -translate-x-px bg-border"
          />
          {/* Spine fill — grows scaleY on scroll */}
          <div
            ref={spineFillRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-8 md:left-1/2 w-px -translate-x-px bg-blush origin-top will-change-transform"
            style={{ height: "100%", transform: "scaleY(0)" }}
          />

          {GUIDE_SECTIONS.map((section, i) => (
            <TimelineSection
              key={section.id}
              section={section}
              index={i}
              isLast={i === GUIDE_SECTIONS.length - 1}
            />
          ))}
        </div>

        {/* Finale — warm-dark full-bleed */}
        <section className="w-full bg-warm-dark">
          <div className="max-w-xl mx-auto px-6 py-20 md:py-28 text-center">
            <h2 className="font-script text-5xl sm:text-[3.25rem] text-cream leading-tight text-balance mb-4">
              Ready to start?
            </h2>
            <p className="text-sm text-warm-light leading-relaxed text-pretty max-w-xs mx-auto mb-10">
              Open Rosie, say hello, and she&apos;ll take it from there.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/chat"
                className="inline-flex items-center min-h-10 px-8 py-3.5 rounded-full bg-cream text-warm-dark text-xs tracking-widest uppercase hover:bg-blush-pale active:scale-[0.96] transition-[background-color,transform] duration-150"
              >
                Ask Rosie
              </Link>
              <Link
                href="/"
                className="inline-flex items-center min-h-10 px-8 py-3.5 rounded-full border border-white/20 text-cream text-xs tracking-widest uppercase hover:border-white/40 active:scale-[0.96] transition-[border-color,transform] duration-150"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
