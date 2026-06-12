import { notFound } from "next/navigation";
import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
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
    return { ...DEFAULT_WEDDING_STATE, ...(data?.data as Partial<WeddingState>) };
  } catch {
    return DEFAULT_WEDDING_STATE;
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

  const status = weddingData.vendors[vendor]?.status ?? "undecided";

  return (
    <ChatPageShell
      initialMessages={messages}
      threadKey={vendor}
      vendorFocus={{
        key: vendor,
        label: vendorFocusLabel(vendor),
        status,
      }}
      openingMessage={vendorOpeningMessage(VENDOR_LABELS[vendor])}
    />
  );
}
