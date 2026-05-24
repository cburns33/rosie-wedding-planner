import Nav from "@/components/Nav";
import ChatInterface from "@/components/ChatInterface";
import { getSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getMessages(): Promise<Message[]> {
  try {
    const { data } = await getSupabase()
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ChatPage() {
  const messages = await getMessages();

  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 flex flex-col pt-16 overflow-hidden">
        <ChatInterface initialMessages={messages} />
      </main>
    </div>
  );
}
