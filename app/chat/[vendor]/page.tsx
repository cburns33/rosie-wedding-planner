import { notFound } from "next/navigation";
import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { vendorOpeningMessage } from "@/lib/system-prompt";
import {
  isVendorKey,
  VENDOR_LABELS,
  vendorFocusLabel,
  type VendorKey,
} from "@/lib/vendors";
import type { Message, WeddingState } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getThreadMessages(threadKey: VendorKey): Promise<Message[]> {
  try {
    const { data } = await getSupabase()
      .from("messages")
      .select("*")
      .eq("thread_key", threadKey)
      .order("created_at", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

async function getWeddingData(): Promise<WeddingState> {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();
    return mergeWeddingState(data?.data as Partial<WeddingState> | undefined);
  } catch {
    return mergeWeddingState();
  }
}

export default async function VendorChatPage({
  params,
}: {
  params: Promise<{ vendor: string }>;
}) {
  const { vendor } = await params;
  if (!isVendorKey(vendor)) notFound();

  const [messages, weddingData] = await Promise.all([
    getThreadMessages(vendor),
    getWeddingData(),
  ]);

  const vendorEntry = weddingData.vendors[vendor];
  const status = vendorEntry?.status ?? "undecided";
  const shortlistCount = vendorEntry?.shortlist.length ?? 0;

  return (
    <ChatPageShell
      initialMessages={messages}
      threadKey={vendor}
      vendorFocus={{
        key: vendor,
        label: vendorFocusLabel(vendor),
        status,
        shortlistCount,
      }}
      openingMessage={vendorOpeningMessage(VENDOR_LABELS[vendor])}
      suggestedPrompts={
        shortlistCount > 0
          ? [`Who's on my ${VENDOR_LABELS[vendor].toLowerCase()} shortlist?`]
          : []
      }
    />
  );
}
