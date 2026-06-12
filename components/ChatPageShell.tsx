"use client";

import Nav from "@/components/Nav";
import ChatInterface from "@/components/ChatInterface";
import type { Message } from "@/lib/types";

interface VendorFocus {
  key: string;
  label: string;
  status: string;
}

interface ChatPageShellProps {
  initialMessages: Message[];
  threadKey?: string | null;
  vendorFocus?: VendorFocus;
  openingMessage?: string;
}

export default function ChatPageShell({
  initialMessages,
  threadKey = null,
  vendorFocus,
  openingMessage,
}: ChatPageShellProps) {
  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 flex flex-col overflow-hidden pt-16">
        <ChatInterface
          initialMessages={initialMessages}
          threadKey={threadKey}
          vendorFocus={vendorFocus}
          openingMessage={openingMessage}
        />
      </main>
    </div>
  );
}
