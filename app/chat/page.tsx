import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import { shouldShowIntro } from "@/lib/intro";
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
    return { ...DEFAULT_WEDDING_STATE, ...(data?.data as Partial<WeddingState>) };
  } catch {
    return DEFAULT_WEDDING_STATE;
  }
}

export default async function ChatPage() {
  const [messages, weddingData] = await Promise.all([
    getMessages(),
    getWeddingData(),
  ]);

  return (
    <ChatPageShell
      initialMessages={messages}
      showIntro={shouldShowIntro(weddingData, messages.length)}
    />
  );
}
