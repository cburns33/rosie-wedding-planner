"use client";

import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import IntroScreen from "./IntroScreen";
import { INITIAL_ROSIE_MESSAGE } from "@/lib/system-prompt";
import type { Message } from "@/lib/types";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
}

export default function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const isFirstVisit = initialMessages.length === 0;

  const [showIntro, setShowIntro] = useState(isFirstVisit);
  const [transitioning, setTransitioning] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    isFirstVisit
      ? []
      : initialMessages.map((m) => ({ role: m.role, content: m.content }))
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStoredInitial = useRef(!isFirstVisit);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, fromIntro = false) {
    if (fromIntro) {
      // Transition out of intro
      setTransitioning(true);
      await new Promise((r) => setTimeout(r, 350));
      setShowIntro(false);
      setMessages([
        { role: "assistant", content: INITIAL_ROSIE_MESSAGE },
        { role: "user", content: text },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { message: text };
      if (!hasStoredInitial.current) {
        body.initialMessage = INITIAL_ROSIE_MESSAGE;
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
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

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
