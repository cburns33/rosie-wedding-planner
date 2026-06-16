import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import {
  INSPIRATION_FOCUS_LABEL,
  INSPIRATION_SUGGESTED_PROMPTS,
  INSPIRATION_THREAD_KEY,
  inspirationOpeningMessage,
} from "@/lib/inspiration";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getThreadMessages(): Promise<Message[]> {
  try {
    const { data } = await getSupabase()
      .from("messages")
      .select("*")
      .eq("thread_key", INSPIRATION_THREAD_KEY)
      .order("created_at", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function InspirationChatPage() {
  const messages = await getThreadMessages();

  return (
    <ChatPageShell
      initialMessages={messages}
      threadKey={INSPIRATION_THREAD_KEY}
      inspirationFocus={{ label: INSPIRATION_FOCUS_LABEL }}
      openingMessage={inspirationOpeningMessage()}
      suggestedPrompts={[...INSPIRATION_SUGGESTED_PROMPTS]}
    />
  );
}
