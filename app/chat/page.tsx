import ChatPageShell from "@/components/ChatPageShell";
import { getSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";

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

export default async function ChatPage() {
  const messages = await getMessages();

  return <ChatPageShell initialMessages={messages} />;
}
