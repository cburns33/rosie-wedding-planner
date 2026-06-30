"use client";

import Nav from "@/components/Nav";
import ChatInterface from "@/components/ChatInterface";
import type { Message, PrimaryColorPicker } from "@/lib/types";

interface VendorFocus {
  key: string;
  label: string;
  status: string;
  shortlistCount?: number;
}

interface InspirationFocus {
  label: string;
}

interface ChatPageShellProps {
  initialMessages: Message[];
  threadKey?: string | null;
  vendorFocus?: VendorFocus;
  inspirationFocus?: InspirationFocus;
  openingMessage?: string;
  initialPrimaryColorPicker?: PrimaryColorPicker | null;
  suggestedPrompts?: string[];
}

export default function ChatPageShell({
  initialMessages,
  threadKey = null,
  vendorFocus,
  inspirationFocus,
  openingMessage,
  initialPrimaryColorPicker = null,
  suggestedPrompts = [],
}: ChatPageShellProps) {
  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 flex flex-col overflow-hidden pt-16">
        <ChatInterface
          initialMessages={initialMessages}
          threadKey={threadKey}
          vendorFocus={vendorFocus}
          inspirationFocus={inspirationFocus}
          openingMessage={openingMessage}
          initialPrimaryColorPicker={initialPrimaryColorPicker}
          suggestedPrompts={suggestedPrompts}
        />
      </main>
    </div>
  );
}
