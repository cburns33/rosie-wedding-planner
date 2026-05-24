"use client";

import { useState, useRef } from "react";
import { INITIAL_ROSIE_MESSAGE } from "@/lib/system-prompt";
import RosieSignature from "./RosieSignature";

interface IntroScreenProps {
  onFirstMessage: (message: string) => void;
  sending: boolean;
}

const SENTENCE_START = 5.6;
const SENTENCE_GAP = 1;

const sentences = INITIAL_ROSIE_MESSAGE.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [
  INITIAL_ROSIE_MESSAGE,
];

const inputDelay = SENTENCE_START + sentences.length * SENTENCE_GAP + 0.4;

export default function IntroScreen({ onFirstMessage, sending }: IntroScreenProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    onFirstMessage(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center">
      <RosieSignature />

      <p className="max-w-2xl text-base text-warm-mid leading-loose mt-8 space-y-0">
        {sentences.map((sentence, i) => (
          <span
            key={i}
            className="rosie-sentence"
            style={{ animationDelay: `${SENTENCE_START + i * SENTENCE_GAP}s` }}
          >
            {sentence}{" "}
          </span>
        ))}
      </p>

      <div
        className="rosie-input-reveal w-full max-w-2xl mt-8"
        style={{ animationDelay: `${inputDelay}s` }}
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={sending}
            placeholder="Tell me…"
            rows={1}
            className="flex-1 resize-none bg-white border border-border rounded-xl px-4 py-3 text-[15px] text-warm-dark placeholder-warm-light focus:outline-none focus:border-blush/50 transition-colors leading-relaxed"
            style={{ minHeight: "48px" }}
          />
          <button
            onClick={handleSend}
            disabled={!value.trim() || sending}
            className="shrink-0 h-12 px-5 bg-warm-dark text-cream rounded-xl text-[13px] tracking-wide font-medium hover:bg-warm-mid disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
