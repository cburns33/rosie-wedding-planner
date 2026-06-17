"use client";

import { useState } from "react";
import IntroMockupA from "@/components/intro-mockups/IntroMockupA";
import IntroMockupB from "@/components/intro-mockups/IntroMockupB";
import IntroMockupC from "@/components/intro-mockups/IntroMockupC";

const OPTIONS = [
  {
    id: "a",
    label: "A — Wordmark curtain",
    summary: "Rosie draws first, companion line follows.",
    Component: IntroMockupA,
  },
  {
    id: "b",
    label: "B — For Kelsie",
    summary: "Personal dedication, then Spring 2027 in sage.",
    Component: IntroMockupB,
  },
  {
    id: "c",
    label: "C — Ink settle",
    summary: "Blush wash, companion leads, Lottie handwriting payoff.",
    Component: IntroMockupC,
  },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

export default function MockupsReview() {
  const [active, setActive] = useState<OptionId>("a");
  const [playKey, setPlayKey] = useState(0);

  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];
  const Mockup = current.Component;

  function replay() {
    setPlayKey((k) => k + 1);
  }

  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-border bg-cream/95 px-6 py-5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-warm-light">
              Intro mockups
            </p>
            <h1 className="font-serif text-2xl font-light text-warm-dark">
              Handwriting animation options
            </h1>
            <p className="mt-1 text-sm text-warm-mid">
              Placeholder Great Vibes paths. Replace with your custom SVG strokes
              later.
            </p>
          </div>
          <button
            type="button"
            onClick={replay}
            className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-border bg-white px-6 text-xs tracking-widest uppercase text-warm-dark transition-[transform,background-color] duration-150 ease-out hover:border-blush hover:bg-blush-pale active:scale-[0.96]"
          >
            Replay animation
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Mockup options"
        >
          {OPTIONS.map((option) => {
            const selected = option.id === active;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(option.id)}
                className={`rounded-full px-4 py-2.5 text-left text-sm transition-colors duration-150 ${
                  selected
                    ? "bg-warm-dark text-cream"
                    : "bg-white text-warm-mid ring-1 ring-border hover:text-warm-dark"
                }`}
              >
                <span className="block font-medium">{option.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${selected ? "text-cream/80" : "text-warm-light"}`}
                >
                  {option.summary}
                </span>
              </button>
            );
          })}
        </div>

        <section
          role="tabpanel"
          aria-label={current.label}
          className="overflow-hidden rounded-2xl ring-1 ring-border shadow-[0_8px_32px_rgba(44,40,37,0.06)]"
        >
          <Mockup key={`${active}-${playKey}`} playKey={playKey} />
        </section>

        <p className="mt-4 text-center text-xs text-warm-light">
          Full-screen preview area above. Each option is a self-contained intro
          sequence.
        </p>
      </div>
    </div>
  );
}
