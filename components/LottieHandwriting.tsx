"use client";

import { useEffect, useRef, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";
import { INTRO_HERO_LOTTIE } from "@/lib/intro-lottie";

interface LottieHandwritingProps {
  src: string;
  playKey?: number;
  className?: string;
  /** Lottie frame range — draw-only segment for hello_anim */
  segment?: [number, number];
  onComplete?: () => void;
}

const DEFAULT_SEGMENT = INTRO_HERO_LOTTIE.segment;

export default function LottieHandwriting({
  src,
  playKey = 0,
  className = "",
  segment = DEFAULT_SEGMENT,
  onComplete,
}: LottieHandwritingProps) {
  const [instance, setInstance] = useState<DotLottie | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!instance) return;

    const handleComplete = () => onCompleteRef.current?.();

    instance.addEventListener("complete", handleComplete);
    return () => instance.removeEventListener("complete", handleComplete);
  }, [instance, playKey]);

  return (
    <div className={className}>
      <DotLottieReact
        key={playKey}
        src={src}
        loop={false}
        autoplay
        segment={segment}
        dotLottieRefCallback={setInstance}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
