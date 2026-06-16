import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { introOpeningMessage } from "@/lib/intro";
import type { Message, WeddingState } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getMessages(): Promise<Message[]> {
  try {
    const { data } = await getSupabase()
      .from("messages")
      .select("*")
      .is("thread_key", null)
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

export default async function ChatPage() {
  const [messages, weddingData] = await Promise.all([
    getMessages(),
    getWeddingData(),
  ]);

  const openingMessage =
    messages.length === 0 && !weddingData.aesthetic.introCompleted
      ? introOpeningMessage()
      : undefined;

  const initialPrimaryColorPicker = weddingData.aesthetic.pendingPrimaryPicker
    ? { hint: undefined }
    : null;

  return (
    <ChatPageShell
      initialMessages={messages}
      openingMessage={openingMessage}
      initialPrimaryColorPicker={initialPrimaryColorPicker}
    />
  );
}
