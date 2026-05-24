import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { buildSystemPrompt, WEDDING_TOOLS } from "@/lib/system-prompt";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import { deepSet } from "@/lib/deep-set";
import type { WeddingState, Message } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getMessages(): Promise<Message[]> {
  const { data } = await getSupabase()
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  return data ?? [];
}

async function getWeddingData(): Promise<WeddingState> {
  const { data } = await getSupabase()
    .from("wedding_state")
    .select("data")
    .eq("id", 1)
    .single();
  return (data?.data as WeddingState) ?? DEFAULT_WEDDING_STATE;
}

async function saveMessage(role: "user" | "assistant", content: string) {
  await getSupabase().from("messages").insert({ role, content });
}

async function applyWeddingDataUpdate(
  path: string,
  value: unknown,
  decisionNote?: string
): Promise<void> {
  const current = await getWeddingData();
  const updated = deepSet(current as unknown as Record<string, unknown>, path, value);

  if (decisionNote) {
    (updated.decisions as Array<{ date: string; decision: string }>).push({
      date: new Date().toISOString().split("T")[0],
      decision: decisionNote,
    });
  }

  await getSupabase()
    .from("wedding_state")
    .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });
}

export async function POST(req: Request) {
  const { message, initialMessage } = await req.json();

  const [dbMessages, weddingData] = await Promise.all([
    getMessages(),
    getWeddingData(),
  ]);

  const systemPrompt = buildSystemPrompt(weddingData);

  const apiMessages: Anthropic.MessageParam[] = [];

  if (initialMessage) {
    apiMessages.push({ role: "assistant", content: initialMessage });
  }

  for (const msg of dbMessages) {
    apiMessages.push({ role: msg.role, content: msg.content });
  }

  apiMessages.push({ role: "user", content: message });

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: apiMessages,
    tools: WEDDING_TOOLS as Anthropic.Tool[],
  });

  let assistantContentBlocks = response.content;
  let loopCount = 0;

  while (response.stop_reason === "tool_use" && loopCount < 3) {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      if (block.name === "update_wedding_data") {
        const input = block.input as {
          path: string;
          value: unknown;
          decision_note?: string;
        };
        await applyWeddingDataUpdate(input.path, input.value, input.decision_note);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Updated successfully.",
        });
      }
    }

    const updatedData = await getWeddingData();
    const updatedSystemPrompt = buildSystemPrompt(updatedData);

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: updatedSystemPrompt,
      messages: [
        ...apiMessages,
        { role: "assistant", content: assistantContentBlocks },
        { role: "user", content: toolResults },
      ],
      tools: WEDDING_TOOLS as Anthropic.Tool[],
    });

    assistantContentBlocks = response.content;
    loopCount++;
  }

  const textBlocks = assistantContentBlocks.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const assistantText = textBlocks.map((b) => b.text).join("");

  await saveMessage("user", message);
  await saveMessage("assistant", assistantText);

  return NextResponse.json({ message: assistantText });
}
