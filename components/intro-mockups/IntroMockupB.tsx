"use client";

import { useState } from "react";
import HandwritingDraw from "@/components/HandwritingDraw";
import { MOCKUP_PATHS } from "@/lib/mockup-paths";

interface IntroMockupBProps {
  playKey: number;
}

/** Option B — personal dedication, season line follows. */
export default function IntroMockupB({ playKey }: IntroMockupBProps) {
  const [showSeason, setShowSeason] = useState(false);

  return (
    <div className="relative flex h-full min-h-[520px] flex-col items-center justify-center gap-6 bg-cream px-8">
      <HandwritingDraw
        key={`for-kelsie-${playKey}`}
        paths={MOCKUP_PATHS.forKelsie}
        className="w-full max-w-[min(78vw,560px)]"
        glyphDuration={440}
        glyphStagger={140}
        startDelay={500}
        playKey={playKey}
        onComplete={() => setShowSeason(true)}
      />

      {showSeason ? (
        <div
          className="mockup-fade-in w-full max-w-[min(50vw,320px)]"
          style={{ animationDelay: "120ms" }}
        >
          <HandwritingDraw
            paths={MOCKUP_PATHS.spring2027}
            className="w-full"
            fill="#8faf8f"
            glyphDuration={360}
            glyphStagger={90}
            playKey={playKey}
          />
        </div>
      ) : null}
    </div>
  );
}
