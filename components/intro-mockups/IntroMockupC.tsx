"use client";

import { useEffect, useState } from "react";
import HandwritingDraw from "@/components/HandwritingDraw";
import LottieHandwriting from "@/components/LottieHandwriting";
import { INTRO_HERO_LOTTIE } from "@/lib/intro-lottie";
import { MOCKUP_PATHS } from "@/lib/mockup-paths";

interface IntroMockupCProps {
  playKey: number;
}

/** Option C — blush wash, companion leads, Lottie handwriting payoff. */
export default function IntroMockupC({ playKey }: IntroMockupCProps) {
  const [phase, setPhase] = useState<"companion" | "hero" | "done">("companion");

  useEffect(() => {
    setPhase("companion");
  }, [playKey]);

  return (
    <div className="relative flex h-full min-h-[520px] flex-col items-center justify-center overflow-hidden bg-cream px-8">
      <div
        className="mockup-wash-in pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div
          className="h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, var(--color-blush-light) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-4">
        <HandwritingDraw
          key={`companion-${playKey}`}
          paths={MOCKUP_PATHS.companion}
          className="w-full max-w-[min(58vw,340px)]"
          fill="#b0a99f"
          glyphDuration={280}
          glyphStagger={50}
          startDelay={500}
          playKey={playKey}
          onComplete={() => setPhase("hero")}
        />

        {phase !== "companion" ? (
          <div className="mockup-fade-in w-full">
            <LottieHandwriting
              playKey={playKey}
              src={INTRO_HERO_LOTTIE.src}
              segment={INTRO_HERO_LOTTIE.segment}
              className="mx-auto aspect-square w-full max-w-[min(72vw,360px)]"
              onComplete={() => setPhase("done")}
            />
            <p className="mt-1 text-center text-[11px] text-warm-light">
              Handwritten &ldquo;Rosie&rdquo; in blush
            </p>
          </div>
        ) : (
          <div
            className="aspect-square w-full max-w-[min(72vw,360px)]"
            aria-hidden
          />
        )}

        {phase === "done" ? (
          <p
            className="mockup-fade-in font-serif text-sm font-light tracking-[0.18em] text-warm-light uppercase"
            style={{ animationDelay: "100ms" }}
          >
            Spring 2027
          </p>
        ) : null}
      </div>
    </div>
  );
}
