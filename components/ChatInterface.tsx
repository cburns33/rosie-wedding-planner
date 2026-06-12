"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import Link from "next/link";
import type { EmailDraft, Message } from "@/lib/types";
import VendorEmailDraftCard from "./VendorEmailDraftCard";

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
  threadKey = null,
  vendorFocus,
  openingMessage,
}: ChatInterfaceProps) {
  const router = useRouter();

  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    if (initialMessages.length > 0) {
      return initialMessages.map((m) => ({ role: m.role, content: m.content }));
    }
    if (openingMessage) {
      return [{ role: "assistant", content: openingMessage }];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [suggestedFocus, setSuggestedFocus] = useState<{
    vendor: string;
    label: string;
  } | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStoredInitial = useRef(initialMessages.length > 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setEmailDraft(null);
    setLoading(true);

    try {
      const body: Record<string, string> = { message: text };
      if (threadKey) body.threadKey = threadKey;
      if (openingMessage && !hasStoredInitial.current) {
        body.initialMessage = openingMessage;
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
        if (data.emailDraft) setEmailDraft(data.emailDraft);
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
        <div className="max-w-2xl mx-auto flex flex-col gap-6 min-h-full">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex items-center justify-center py-16">
              <p className="text-sm text-warm-light">What&apos;s on your mind?</p>
            </div>
          )}

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

          {emailDraft && <VendorEmailDraftCard draft={emailDraft} />}

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

      <ChatInput onSend={sendMessage} disabled={loading} />
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
