"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import Link from "next/link";
import type {
  EmailDraft,
  Message,
  PrimaryColorPicker,
  CoolorsHandoff,
  VendorCandidate,
  VendorCandidates,
} from "@/lib/types";
import CoolorsHandoffCard from "./CoolorsHandoffCard";
import { primaryColorLabel } from "@/lib/colors/primary-colors";
import VendorEmailDraftCard from "./VendorEmailDraftCard";
import PrimaryColorPickerCard from "./PrimaryColorPickerCard";
import VendorCandidatesCard from "./VendorCandidatesCard";
import { isInspirationThreadKey } from "@/lib/inspiration";
import {
  estimateChatPayloadBytes,
  MAX_CHAT_REQUEST_BYTES,
  messageContainsEmbeddedImage,
} from "@/lib/chat-images";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

interface VendorFocus {
  key: string;
  label: string;
  status: string;
  shortlistCount?: number;
}

interface InspirationFocus {
  label: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
  threadKey?: string | null;
  vendorFocus?: VendorFocus;
  inspirationFocus?: InspirationFocus;
  openingMessage?: string;
  initialPrimaryColorPicker?: PrimaryColorPicker | null;
  suggestedPrompts?: string[];
}

function addToSet(setter: (fn: (prev: Set<string>) => Set<string>) => void, value: string) {
  setter((prev) => new Set(prev).add(value));
}

function removeFromSet(setter: (fn: (prev: Set<string>) => Set<string>) => void, value: string) {
  setter((prev) => {
    const next = new Set(prev);
    next.delete(value);
    return next;
  });
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
  inspirationFocus,
  openingMessage,
  initialPrimaryColorPicker = null,
  suggestedPrompts = [],
}: ChatInterfaceProps) {
  const router = useRouter();
  const allowImages =
    !threadKey || isInspirationThreadKey(threadKey ?? undefined);

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
  const [primaryColorPicker, setPrimaryColorPicker] = useState<PrimaryColorPicker | null>(
    initialPrimaryColorPicker
  );
  const [coolorsHandoff, setCoolorsHandoff] = useState<CoolorsHandoff | null>(null);
  const [vendorCandidates, setVendorCandidates] = useState<VendorCandidates | null>(null);
  const [savingCandidateUrls, setSavingCandidateUrls] = useState<Set<string>>(new Set());
  const [savedCandidateUrls, setSavedCandidateUrls] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStoredInitial = useRef(initialMessages.length > 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, primaryColorPicker, coolorsHandoff, vendorCandidates]);

  async function sendMessage(
    text: string,
    images?: string[],
    primaryPicks?: string[],
    saveVendorCandidate?: VendorCandidate
  ) {
    if (messageContainsEmbeddedImage(text)) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Use the attach button (paperclip) for screenshots — don't paste images into the text field.",
        },
      ]);
      return;
    }

    if (!saveVendorCandidate) {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: text || (images?.length ? "(Uploaded inspiration screenshot)" : ""),
        },
      ]);
    }
    setEmailDraft(null);
    setCoolorsHandoff(null);
    if (!saveVendorCandidate) setVendorCandidates(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { message: text };
      if (threadKey) body.threadKey = threadKey;
      if (images && images.length > 0) body.images = images;
      if (primaryPicks && primaryPicks.length === 2) body.primaryPicks = primaryPicks;
      if (saveVendorCandidate) body.saveVendorCandidate = saveVendorCandidate;
      if (openingMessage && !hasStoredInitial.current) {
        body.initialMessage = openingMessage;
        hasStoredInitial.current = true;
      }

      if (estimateChatPayloadBytes(body) > MAX_CHAT_REQUEST_BYTES) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "That upload is still too large to send. Try one screenshot at a time, or a smaller image.",
          },
        ]);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown> = {};
      const responseText = await res.text();
      if (responseText) {
        try {
          data = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          data = {};
        }
      }

      if (!res.ok) {
        const fallback =
          res.status === 413
            ? "That screenshot is too large to send. Use the attach button and try a smaller image."
            : "Rosie's having a brief connection hiccup. Try sending that again.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              typeof data.message === "string" && data.message.trim()
                ? data.message
                : fallback,
          },
        ]);
        if (saveVendorCandidate) {
          removeFromSet(setSavingCandidateUrls, saveVendorCandidate.url);
        }
        return;
      }
      const replyMessage =
        typeof data.message === "string" ? data.message.trim() : "";
      if (replyMessage) {
        setMessages((prev) => [...prev, { role: "assistant", content: replyMessage }]);
        if (
          data.suggestFocus &&
          typeof data.suggestFocus === "object" &&
          "vendor" in data.suggestFocus &&
          "label" in data.suggestFocus
        ) {
          setSuggestedFocus(data.suggestFocus as { vendor: string; label: string });
        }
        if (data.emailDraft) setEmailDraft(data.emailDraft as EmailDraft);
        if (data.primaryColorPicker) {
          setPrimaryColorPicker(data.primaryColorPicker as PrimaryColorPicker);
        }
        if (data.coolorsHandoff) {
          setCoolorsHandoff(data.coolorsHandoff as CoolorsHandoff);
        }
        if (data.vendorCandidates) {
          setVendorCandidates(data.vendorCandidates as VendorCandidates);
        }
        if (saveVendorCandidate) {
          removeFromSet(setSavingCandidateUrls, saveVendorCandidate.url);
          addToSet(setSavedCandidateUrls, saveVendorCandidate.url);
        }
        router.refresh();
        window.dispatchEvent(new Event("wedding-state-updated"));
        if (typeof data.redirectTo === "string" && data.redirectTo) {
          router.push(data.redirectTo);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I didn't get a reply through. Try sending that once more.",
          },
        ]);
      }
    } catch {
      const content =
        images && images.length > 0
          ? "That screenshot didn't go through — try the attach button again with a smaller image."
          : "Something went wrong. Try again in a moment.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
      if (saveVendorCandidate) {
        removeFromSet(setSavingCandidateUrls, saveVendorCandidate.url);
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePrimaryPicksConfirmed(picks: string[]) {
    setPrimaryColorPicker(null);
    const labels = picks.map((hex) => primaryColorLabel(hex)).join(" and ");
    sendMessage(`I've picked ${labels} as my two primary colors.`, undefined, picks);
  }

  function handleSaveCandidate(candidate: VendorCandidate) {
    addToSet(setSavingCandidateUrls, candidate.url);
    sendMessage("", undefined, undefined, candidate);
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
                {vendorFocus.shortlistCount && vendorFocus.status === "considering"
                  ? `${vendorFocus.shortlistCount} in consideration`
                  : vendorFocus.status}
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

      {inspirationFocus && (
        <div className="border-b border-sage/30 bg-sage/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <h1 className="font-serif text-lg font-light text-cream">
              {inspirationFocus.label}
            </h1>
            <Link
              href="/chat"
              className="inline-flex items-center h-10 text-xs tracking-widest uppercase text-cream/75 hover:text-cream transition-colors"
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

          {vendorCandidates && (
            <VendorCandidatesCard
              data={vendorCandidates}
              onSave={handleSaveCandidate}
              savingUrls={savingCandidateUrls}
              savedUrls={savedCandidateUrls}
            />
          )}

          {coolorsHandoff && <CoolorsHandoffCard url={coolorsHandoff.url} />}

          {primaryColorPicker && (
            <PrimaryColorPickerCard
              picker={primaryColorPicker}
              onConfirm={handlePrimaryPicksConfirmed}
              disabled={loading}
            />
          )}

          {!loading && suggestedPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(prompt)}
                  className="inline-flex items-center rounded-full border border-sage/30 bg-sage-pale text-warm-dark text-xs px-3.5 py-2 min-h-10 hover:bg-sage-light active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-1 max-w-[72%]">
              <span className="text-[11px] tracking-widest uppercase text-warm-light px-1">
                Rosie
              </span>
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-[0_0_0_1px_rgba(44,40,37,0.04),0_2px_8px_rgba(44,40,37,0.05)]">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} allowImages={allowImages} />
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
