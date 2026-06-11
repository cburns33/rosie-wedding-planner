"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import IntroScreen from "./IntroScreen";
import Link from "next/link";
import { INITIAL_ROSIE_MESSAGE } from "@/lib/system-prompt";
import type { Message } from "@/lib/types";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

interface VendorFocus {
  key: string;
  label: string;
  status: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
  showIntro: boolean;
  onIntroDismiss?: () => void;
  threadKey?: string | null;
  vendorFocus?: VendorFocus;
  openingMessage?: string;
}

const STATUS_STYLES: Record<string, string> = {
  undecided: "bg-cream text-warm-light border border-border",
  considering: "bg-mist-light text-mist border border-mist/20",
  contacted: "bg-sage-light text-sage border border-sage/20",
  booked: "bg-blush-light text-blush border border-blush/20",
};

export default function ChatInterface({
  initialMessages,
  showIntro: showIntroInitially,
  onIntroDismiss,
  threadKey = null,
  vendorFocus,
  openingMessage,
}: ChatInterfaceProps) {
  const router = useRouter();

  const opening = openingMessage ?? INITIAL_ROSIE_MESSAGE;

  const [showIntro, setShowIntro] = useState(showIntroInitially);
  const [transitioning, setTransitioning] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    if (showIntroInitially) return [];
    if (initialMessages.length === 0 && openingMessage) {
      return [{ role: "assistant", content: opening }];
    }
    return initialMessages.map((m) => ({ role: m.role, content: m.content }));
  });
  const [loading, setLoading] = useState(false);
  const [suggestedFocus, setSuggestedFocus] = useState<{
    vendor: string;
    label: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStoredInitial = useRef(initialMessages.length > 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, fromIntro = false) {
    if (fromIntro) {
      onIntroDismiss?.();
      setTransitioning(true);
      await new Promise((r) => setTimeout(r, 350));
      setShowIntro(false);
      setMessages([
        { role: "assistant", content: opening },
        { role: "user", content: text },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { message: text };
      if (threadKey) body.threadKey = threadKey;
      if (!hasStoredInitial.current) {
        body.initialMessage = opening;
        hasStoredInitial.current = true;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        if (data.suggestFocus) setSuggestedFocus(data.suggestFocus);
        router.refresh();
        window.dispatchEvent(new Event("wedding-state-updated"));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (showIntro) {
    return (
      <div
        className="flex-1 transition-opacity duration-300"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        <IntroScreen
          onFirstMessage={(msg) => sendMessage(msg, true)}
          sending={loading}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {vendorFocus && (
        <div className="border-b border-border bg-cream/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-lg font-light text-warm-dark capitalize">
                {vendorFocus.label}
              </h1>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full capitalize ${
                  STATUS_STYLES[vendorFocus.status] ?? STATUS_STYLES.undecided
                }`}
              >
                {vendorFocus.status}
              </span>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center h-10 text-xs tracking-widest uppercase text-warm-light hover:text-warm-mid transition-colors"
            >
              Ask Rosie
            </Link>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {suggestedFocus && (
            <div className="flex justify-start">
              <Link
                href={`/chat/${suggestedFocus.vendor}`}
                className="inline-flex items-center gap-2 rounded-full bg-blush-pale border border-blush/20 text-warm-dark text-sm px-4 py-2.5 hover:bg-blush-light active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out"
              >
                Open your {suggestedFocus.label.toLowerCase()} focus
                <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-1 max-w-[72%]">
              <span className="text-[11px] tracking-widest uppercase text-warm-light px-1">
                Rosie
              </span>
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={(msg) => sendMessage(msg, false)} disabled={loading} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-warm-light animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}
