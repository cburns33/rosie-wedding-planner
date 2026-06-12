import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import {
  buildSystemPrompt,
  getTools,
  vendorOpeningMessage,
  type VendorFocusContext,
  type ZolaPromptContext,
} from "@/lib/system-prompt";
import { getLatestSnapshot, getZolaProfileUrl } from "@/lib/zola/store";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import { deepSet } from "@/lib/deep-set";
import {
  isVendorKey,
  VENDOR_LABELS,
  vendorFocusLabel,
  type VendorKey,
} from "@/lib/vendors";
import type { WeddingState, Message } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getMessages(threadKey: VendorKey | null): Promise<Message[]> {
  let query = getSupabase()
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  query = threadKey
    ? query.eq("thread_key", threadKey)
    : query.is("thread_key", null);
  const { data } = await query;
  return data ?? [];
}

async function getWeddingData(): Promise<WeddingState> {
  const { data } = await getSupabase()
    .from("wedding_state")
    .select("data")
    .eq("id", 1)
    .single();
  return { ...DEFAULT_WEDDING_STATE, ...(data?.data as Partial<WeddingState>) };
}

async function saveMessage(
  role: "user" | "assistant",
  content: string,
  threadKey: VendorKey | null
) {
  await getSupabase().from("messages").insert({ role, content, thread_key: threadKey });
}

async function getVendorMemory(vendor: VendorKey): Promise<string> {
  const { data } = await getSupabase()
    .from("vendor_memory")
    .select("markdown")
    .eq("vendor", vendor)
    .single();
  return (data?.markdown as string | undefined) ?? "";
}

async function upsertVendorMemory(vendor: VendorKey, markdown: string) {
  await getSupabase()
    .from("vendor_memory")
    .upsert({ vendor, markdown, updated_at: new Date().toISOString() });
}

async function appendVendorNote(
  vendor: VendorKey,
  note: string,
  section?: string
) {
  const current = await getVendorMemory(vendor);
  const date = new Date().toISOString().split("T")[0];
  const line = section
    ? `- (${date}) [${section}] ${note}`
    : `- (${date}) ${note}`;
  const next = current.trim() ? `${current.trim()}\n${line}` : line;
  await upsertVendorMemory(vendor, next);
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

async function markIntroCompleted(): Promise<void> {
  const current = await getWeddingData();
  if (current.intro_completed) return;

  await getSupabase()
    .from("wedding_state")
    .upsert({
      id: 1,
      data: { ...current, intro_completed: true },
      updated_at: new Date().toISOString(),
    });
}

async function buildVendorFocus(
  vendor: VendorKey
): Promise<VendorFocusContext> {
  return {
    key: vendor,
    label: vendorFocusLabel(vendor),
    memory: await getVendorMemory(vendor),
  };
}

export async function POST(req: Request) {
  const { message, initialMessage, threadKey: rawThreadKey } = await req.json();

  const threadKey: VendorKey | null =
    typeof rawThreadKey === "string" && isVendorKey(rawThreadKey)
      ? rawThreadKey
      : null;

  if (initialMessage && !threadKey) {
    await markIntroCompleted();
  }

  const [dbMessages, weddingData, storedZola, zolaProfileUrl] = await Promise.all([
    getMessages(threadKey),
    getWeddingData(),
    getLatestSnapshot(),
    getZolaProfileUrl(),
  ]);

  const zolaContext: ZolaPromptContext | null = storedZola
    ? { snapshot: storedZola.snapshot, profileUrl: zolaProfileUrl }
    : null;

  const vendorFocus = threadKey ? await buildVendorFocus(threadKey) : undefined;
  const tools = getTools(threadKey) as Anthropic.Tool[];

  const systemPrompt = buildSystemPrompt(weddingData, vendorFocus, zolaContext);

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
    tools,
  });

  let assistantContentBlocks = response.content;
  let loopCount = 0;
  let suggestFocus: { vendor: VendorKey; label: string } | null = null;

  while (response.stop_reason === "tool_use" && loopCount < 3) {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      let result = "Done.";

      if (block.name === "update_wedding_data") {
        const input = block.input as {
          path: string;
          value: unknown;
          decision_note?: string;
        };
        await applyWeddingDataUpdate(input.path, input.value, input.decision_note);
        result = "Updated successfully.";
      } else if (block.name === "update_vendor_memory") {
        const input = block.input as { vendor: string; markdown: string };
        if (isVendorKey(input.vendor)) {
          await upsertVendorMemory(input.vendor, input.markdown);
          result = "Memory saved.";
        } else {
          result = "Unknown vendor.";
        }
      } else if (block.name === "note_for_vendor") {
        const input = block.input as {
          vendor: string;
          note: string;
          section?: string;
        };
        if (isVendorKey(input.vendor)) {
          await appendVendorNote(input.vendor, input.note, input.section);
          result = "Noted.";
        } else {
          result = "Unknown vendor.";
        }
      } else if (block.name === "get_zola_summary") {
        if (storedZola) {
          result = JSON.stringify({
            rsvps: storedZola.snapshot.summary,
            registry: storedZola.snapshot.registry ?? null,
            meals: storedZola.snapshot.meals ?? null,
            syncedAt: storedZola.snapshot.syncedAt,
          });
        } else {
          result = "No Zola data available yet — use the planning estimates instead.";
        }
      } else if (block.name === "suggest_vendor_focus") {
        const input = block.input as { vendor: string; reason?: string };
        if (isVendorKey(input.vendor)) {
          suggestFocus = {
            vendor: input.vendor,
            label: VENDOR_LABELS[input.vendor],
          };
          result = "Suggestion surfaced.";
        } else {
          result = "Unknown vendor.";
        }
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    const updatedData = await getWeddingData();
    const updatedFocus = threadKey
      ? await buildVendorFocus(threadKey)
      : undefined;
    const updatedSystemPrompt = buildSystemPrompt(
      updatedData,
      updatedFocus,
      zolaContext
    );

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: updatedSystemPrompt,
      messages: [
        ...apiMessages,
        { role: "assistant", content: assistantContentBlocks },
        { role: "user", content: toolResults },
      ],
      tools,
    });

    assistantContentBlocks = response.content;
    loopCount++;
  }

  const textBlocks = assistantContentBlocks.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const assistantText = textBlocks.map((b) => b.text).join("");

  await saveMessage("user", message, threadKey);
  await saveMessage("assistant", assistantText, threadKey);

  return NextResponse.json({ message: assistantText, suggestFocus });
}
