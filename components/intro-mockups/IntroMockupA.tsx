"use client";

import { useState } from "react";
import HandwritingDraw from "@/components/HandwritingDraw";
import { MOCKUP_PATHS } from "@/lib/mockup-paths";

interface IntroMockupAProps {
  playKey: number;
}

/** Option A — hero wordmark, companion line fades in after. */
export default function IntroMockupA({ playKey }: IntroMockupAProps) {
  const [showSubtitle, setShowSubtitle] = useState(false);

  return (
    <div className="relative flex h-full min-h-[520px] flex-col items-center justify-center bg-cream px-8">
      <HandwritingDraw
        key={`rosie-${playKey}`}
        paths={MOCKUP_PATHS.rosie}
        className="w-full max-w-[min(72vw,520px)]"
        glyphDuration={480}
        glyphStagger={160}
        startDelay={400}
        playKey={playKey}
        onComplete={() => setShowSubtitle(true)}
      />

      {showSubtitle ? (
        <div
          className="mockup-fade-in mt-2 w-full max-w-[min(68vw,440px)]"
          style={{ animationDelay: "200ms" }}
        >
          <HandwritingDraw
            paths={MOCKUP_PATHS.companion}
            className="w-full"
            fill="#b0a99f"
            glyphDuration={320}
            glyphStagger={70}
            playKey={playKey}
          />
        </div>
      ) : null}
    </div>
  );
}
