"use client";

import { useEffect, useState } from "react";
import type { MockupTextPaths } from "@/lib/mockup-paths";

interface HandwritingDrawProps {
  paths: MockupTextPaths;
  className?: string;
  fill?: string;
  glyphDuration?: number;
  glyphStagger?: number;
  startDelay?: number;
  playKey?: number;
  onComplete?: () => void;
}

export default function HandwritingDraw({
  paths,
  className = "",
  fill = "#c9a0a0",
  glyphDuration = 520,
  glyphStagger = 180,
  startDelay = 0,
  playKey = 0,
  onComplete,
}: HandwritingDrawProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const totalMs =
    startDelay +
    Math.max(0, paths.glyphs.length - 1) * glyphStagger +
    glyphDuration;

  useEffect(() => {
    if (!onComplete) return;
    const timer = window.setTimeout(onComplete, reducedMotion ? 0 : totalMs);
    return () => window.clearTimeout(timer);
  }, [onComplete, playKey, reducedMotion, totalMs]);

  return (
    <svg
      viewBox={paths.viewBox}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {paths.glyphs.map((glyph, index) => (
        <path
          key={`${playKey}-${glyph.id}`}
          d={glyph.d}
          fill={fill}
          stroke="none"
          className={reducedMotion ? "handwriting-glyph-static" : "handwriting-glyph"}
          style={
            reducedMotion
              ? undefined
              : {
                  animationDuration: `${glyphDuration}ms`,
                  animationDelay: `${startDelay + index * glyphStagger}ms`,
                }
          }
        />
      ))}
    </svg>
  );
}
