import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import {
  buildSystemPrompt,
  getTools,
  type InspirationFocusContext,
  type VendorFocusContext,
  type ZolaPromptContext,
} from "@/lib/system-prompt";
import { getLatestSnapshot, getZolaProfileUrl } from "@/lib/zola/store";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { isProtectedFromChatWeddingDataPath } from "@/lib/wedding-data-guard";
import { deepSet } from "@/lib/deep-set";
import {
  isVendorKey,
  VENDOR_LABELS,
  vendorFocusLabel,
  type VendorKey,
} from "@/lib/vendors";
import { extractCoolorsFromText, genCoolorsStarterFromPrimaryPicks } from "@/lib/colors/coolors";
import { coolorsToPalette } from "@/lib/colors/infer";
import { applyPaletteToWeddingState, savePrimaryPicksToState } from "@/lib/colors/apply-palette-state";
import {
  buildIntroBeatDirectiveBlock,
  buildIntroBeatUserHint,
  countPriorUserTurns,
  isAffirmativeAnswer,
  isEmptyOrOffTopicAnswer,
  resolveIntroBeat,
  type IntroBeatId,
  type IntroBeatResolution,
} from "@/lib/intro-beats";
import {
  buildIntroReflectPrompt,
  composeScriptedIntroReply,
  getIntroReflectFallback,
  isScriptedIntroBeat,
  persistIntroUserAnswer,
} from "@/lib/intro-script";
import {
  applyIntroCompletionSideEffects,
  finalizeVibeDisplayFields,
} from "@/lib/vibe-display";
import {
  chatThreadIsVendor,
  parseChatThreadKey,
  type ChatThreadKey,
} from "@/lib/chat-thread";
import {
  getInspirationMemory,
  upsertInspirationMemory,
} from "@/lib/inspiration";
import type { WeddingState, Message, EmailDraft, PrimaryColorPicker, CoolorsHandoff } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function getMessages(threadKey: ChatThreadKey): Promise<Message[]> {
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
  return mergeWeddingState(data?.data as Partial<WeddingState> | undefined);
}

async function saveMessage(
  role: "user" | "assistant",
  content: string,
  threadKey: ChatThreadKey
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

async function setPendingPrimaryPicker(active: boolean): Promise<void> {
  const current = await getWeddingData();
  const updated = deepSet(
    current as unknown as Record<string, unknown>,
    "aesthetic.pendingPrimaryPicker",
    active
  );
  await getSupabase()
    .from("wedding_state")
    .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });
}

async function advanceIntroUserTurn(userTurnNumber: number): Promise<void> {
  await applyWeddingDataUpdate("aesthetic.introUserTurns", userTurnNumber);
}

async function applyWeddingDataUpdate(
  path: string,
  value: unknown,
  decisionNote?: string
): Promise<void> {
  if (isProtectedFromChatWeddingDataPath(path)) {
    return;
  }

  const current = await getWeddingData();
  let updated = deepSet(
    current as unknown as Record<string, unknown>,
    path,
    value
  ) as unknown as WeddingState;

  if (path === "aesthetic.introCompleted" && value === true) {
    updated = applyIntroCompletionSideEffects(updated, decisionNote);
  } else if (decisionNote) {
    updated = {
      ...updated,
      decisions: [
        ...updated.decisions,
        {
          date: new Date().toISOString().split("T")[0],
          decision: decisionNote,
        },
      ],
    };
  }

  await getSupabase()
    .from("wedding_state")
    .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });
}

async function buildInspirationFocus(): Promise<InspirationFocusContext> {
  return {
    memory: await getInspirationMemory(),
  };
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

type ImageBlock = Anthropic.ImageBlockParam;

function parseDataUrl(dataUrl: string): ImageBlock | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (!match) return null;
  const mediaType = match[1].toLowerCase() as "image/jpeg" | "image/png" | "image/webp";
  const data = match[2];
  const byteLength = Math.ceil((data.length * 3) / 4);
  if (byteLength > MAX_IMAGE_BYTES) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data },
  };
}

function buildUserContent(
  message: string,
  images?: string[]
): Anthropic.MessageParam["content"] {
  const blocks: Array<Anthropic.TextBlockParam | ImageBlock> = [];

  if (images && images.length > 0) {
    for (const img of images.slice(0, MAX_IMAGES)) {
      const block = parseDataUrl(img);
      if (block) blocks.push(block);
    }
    const imageNote =
      blocks.length === 1
        ? "Kelsie uploaded 1 inspiration screenshot."
        : `Kelsie uploaded ${blocks.length} inspiration screenshots.`;
    blocks.unshift({
      type: "text",
      text: `${imageNote}\n\n${message}`.trim(),
    });
  } else {
    blocks.push({ type: "text", text: message });
  }

  return blocks;
}

function storedUserMessage(message: string, imageCount: number): string {
  if (imageCount <= 0) return message;
  if (imageCount === 1) {
    const trimmed = message.trim();
    return trimmed
      ? `${trimmed}\n(Uploaded 1 inspiration screenshot)`
      : "Uploaded 1 inspiration screenshot";
  }
  const trimmed = message.trim();
  return trimmed
    ? `${trimmed}\n(Uploaded ${imageCount} inspiration screenshots)`
    : `Uploaded ${imageCount} inspiration screenshots`;
}

function extractAssistantText(
  blocks: Anthropic.ContentBlock[]
): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function generateIntroReflectSentence(
  userAnswer: string,
  beat: IntroBeatId
): Promise<string> {
  const { system, user } = buildIntroReflectPrompt(userAnswer, beat);
  try {
    const response = await createAnthropicMessage(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 120,
        system,
        messages: [{ role: "user", content: user }],
      },
      2
    );
    const text = extractAssistantText(response.content).trim();
    if (text) {
      return text.replace(/\?+$/, ".").replace(/—/g, ",");
    }
  } catch {
    /* use fallback */
  }
  return getIntroReflectFallback(beat);
}

const TEXT_ONLY_NUDGE =
  "[System: Send your visible reply to Kelsie now. No tool calls on this turn.]";

const DASHBOARD_HANDOFF_QUESTION =
  "Great — ready to see your planning dashboard now?";

async function handleDashboardHandoffTurn(params: {
  resolution: IntroBeatResolution;
  rawUserMessage: string;
  imageList: string[];
  threadKey: ChatThreadKey;
}): Promise<NextResponse | null> {
  const { resolution, rawUserMessage, imageList, threadKey } = params;
  if (resolution.beat !== "8" || threadKey !== null) return null;

  const weddingData = await getWeddingData();
  const storedMessage = storedUserMessage(rawUserMessage, imageList.length);
  await saveMessage("user", storedMessage, threadKey);

  if (
    weddingData.aesthetic.dashboardHandoffAsked &&
    isAffirmativeAnswer(rawUserMessage)
  ) {
    await applyWeddingDataUpdate("aesthetic.dashboardHandoffPending", false);
    const assistantText = "Perfect — taking you there now.";
    await saveMessage("assistant", assistantText, threadKey);
    await advanceIntroUserTurn(resolution.userTurnNumber);
    return NextResponse.json({
      message: assistantText,
      suggestFocus: null,
      emailDraft: null,
      primaryColorPicker: null,
      coolorsHandoff: null,
      redirectTo: "/",
    });
  }

  if (!weddingData.aesthetic.dashboardHandoffAsked) {
    await applyWeddingDataUpdate("aesthetic.dashboardHandoffAsked", true);
    await saveMessage("assistant", DASHBOARD_HANDOFF_QUESTION, threadKey);
    await advanceIntroUserTurn(resolution.userTurnNumber);
    return NextResponse.json({
      message: DASHBOARD_HANDOFF_QUESTION,
      suggestFocus: null,
      emailDraft: null,
      primaryColorPicker: null,
      coolorsHandoff: null,
    });
  }

  const assistantText =
    "No rush — whenever you're ready, just say yes and I'll open your planning dashboard.";
  await saveMessage("assistant", assistantText, threadKey);
  await advanceIntroUserTurn(resolution.userTurnNumber);
  return NextResponse.json({
    message: assistantText,
    suggestFocus: null,
    emailDraft: null,
    primaryColorPicker: null,
    coolorsHandoff: null,
  });
}

async function handleScriptedIntroTurn(params: {
  resolution: IntroBeatResolution;
  rawUserMessage: string;
  imageList: string[];
  threadKey: ChatThreadKey;
}): Promise<NextResponse | null> {
  const { resolution, rawUserMessage, imageList, threadKey } = params;
  const { beat, userTurnNumber } = resolution;

  if (
    !isScriptedIntroBeat(beat) ||
    isEmptyOrOffTopicAnswer(rawUserMessage) ||
    imageList.length > 0
  ) {
    return null;
  }

  await persistIntroUserAnswer(userTurnNumber, rawUserMessage, (path, value) =>
    applyWeddingDataUpdate(path, value)
  );

  if (userTurnNumber >= 4) {
    const latest = await getWeddingData();
    const display = finalizeVibeDisplayFields(latest.aesthetic);
    if (display.style) {
      await applyWeddingDataUpdate("aesthetic.style", display.style);
    }
    if (display.borrow.length > 0) {
      await applyWeddingDataUpdate("aesthetic.borrow", display.borrow);
    }
    if (display.avoid.length > 0) {
      await applyWeddingDataUpdate("aesthetic.avoid", display.avoid);
    }
  }

  const reflect = await generateIntroReflectSentence(rawUserMessage, beat);
  const assistantText = composeScriptedIntroReply(reflect, beat);

  let primaryColorPicker: PrimaryColorPicker | null = null;
  if (beat === "5a") {
    primaryColorPicker = {
      hint: "Pick two colors that feel closest to your vibe.",
    };
    await setPendingPrimaryPicker(true);
  }

  const storedMessage = storedUserMessage(rawUserMessage, imageList.length);
  await saveMessage("user", storedMessage, threadKey);
  await saveMessage("assistant", assistantText, threadKey);
  await advanceIntroUserTurn(userTurnNumber);

  return NextResponse.json({
    message: assistantText,
    suggestFocus: null,
    emailDraft: null,
    primaryColorPicker,
    coolorsHandoff: null,
  });
}

function isRetryableAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 500 || status === 529 || status === 503) return true;
  const type = (err as { error?: { type?: string } }).error?.type;
  return type === "api_error" || type === "overloaded_error";
}

async function createAnthropicMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxAttempts = 3
): Promise<Anthropic.Message> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      lastError = err;
      if (!isRetryableAnthropicError(err) || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  try {
  return await handleChatPost(req);
  } catch (err) {
    console.error("POST /api/chat failed:", err);
    const message =
      isRetryableAnthropicError(err)
        ? "Rosie's having a brief connection hiccup. Try sending that again in a moment."
        : "Something went wrong on our end. Try again in a moment.";
    return NextResponse.json({ error: message, message }, { status: 502 });
  }
}

async function handleChatPost(req: Request) {
  const {
    message,
    initialMessage,
    threadKey: rawThreadKey,
    images,
    primaryPicks: rawPrimaryPicks,
  } = await req.json();

  const threadKey = parseChatThreadKey(rawThreadKey);
  const vendorKey = chatThreadIsVendor(threadKey) ? threadKey : null;
  const inspirationFocus = threadKey !== null && !vendorKey;

  const imageList = Array.isArray(images)
    ? (images as string[]).filter((i) => typeof i === "string")
    : [];

  let userMessage = typeof message === "string" ? message : "";
  const rawUserMessage = userMessage;

  if (
    threadKey === null &&
    Array.isArray(rawPrimaryPicks) &&
    rawPrimaryPicks.length === 2
  ) {
    await savePrimaryPicksToState(rawPrimaryPicks as string[]);
    userMessage = `${rawUserMessage}\n\n[System: Kelsie confirmed two primary colors in the inline picker (beat 5b). Reply briefly: acknowledge her picks, explain lock + spacebar shuffle + paste Export → URL (the Coolors handoff card is already visible). Do NOT ask questions from earlier intro beats or open new topics.]`;
  }

  const coolorsHandoffFromPicks =
    threadKey === null &&
    Array.isArray(rawPrimaryPicks) &&
    rawPrimaryPicks.length === 2
      ? { url: genCoolorsStarterFromPrimaryPicks(rawPrimaryPicks as string[]) }
      : null;

  const [dbMessages, weddingData, storedZola, zolaProfileUrl, inspirationMemory] =
    await Promise.all([
      getMessages(threadKey),
      getWeddingData(),
      getLatestSnapshot(),
      getZolaProfileUrl(),
      threadKey === null || inspirationFocus
        ? getInspirationMemory()
        : Promise.resolve(""),
    ]);

  const zolaContext: ZolaPromptContext | null = storedZola
    ? { snapshot: storedZola.snapshot, profileUrl: zolaProfileUrl }
    : null;

  const vendorFocus = vendorKey ? await buildVendorFocus(vendorKey) : undefined;
  const inspirationFocusContext = inspirationFocus
    ? { memory: inspirationMemory }
    : undefined;
  const tools = getTools({
    vendorKey,
    inspiration: inspirationFocus,
  }) as Anthropic.Tool[];

  const hasPrimaryPicksConfirm =
    threadKey === null &&
    Array.isArray(rawPrimaryPicks) &&
    rawPrimaryPicks.length === 2;

  const coolorsColors = extractCoolorsFromText(rawUserMessage);
  if (coolorsColors && threadKey === null) {
    const palette = coolorsToPalette(coolorsColors);
    await applyPaletteToWeddingState(palette);
    userMessage = `${rawUserMessage}\n\n[System: Kelsie pasted a Coolors palette URL (Export → URL). Palette auto-applied: ${palette.join(", ")}. Acknowledge warmly and continue the intro toward wrap-up. Do not call show_primary_color_picker.]`;
  }

  let introBeatResolution: IntroBeatResolution | null = null;
  if (threadKey === null && !weddingData.aesthetic.introCompleted) {
    introBeatResolution = resolveIntroBeat({
      weddingData,
      priorUserTurns: countPriorUserTurns(dbMessages),
      userMessage: rawUserMessage,
      hasPrimaryPicksConfirm,
      hasCoolorsPaste: Boolean(coolorsColors),
    });
  }

  let systemPrompt = buildSystemPrompt(
    weddingData,
    vendorFocus,
    zolaContext,
    inspirationFocusContext,
    threadKey === null ? inspirationMemory : undefined
  );
  const introBeatDirective =
    introBeatResolution &&
    buildIntroBeatDirectiveBlock(introBeatResolution, rawUserMessage);
  if (introBeatDirective) {
    systemPrompt += introBeatDirective;
  }

  if (
    introBeatResolution &&
    !hasPrimaryPicksConfirm &&
    !coolorsColors &&
    threadKey === null
  ) {
    const userHint = buildIntroBeatUserHint(
      introBeatResolution.beat,
      rawUserMessage
    );
    if (userHint) {
      userMessage = `${userMessage}\n\n[${userHint}]`;
    }
  }

  if (imageList.length > 0 && inspirationFocus) {
    systemPrompt += `\n\n**Image upload**

Kelsie attached inspiration screenshot(s). Describe layout, florals, lighting, and mood in plain language, then call update_inspiration_memory with dated observation bullets. Do not infer or change her palette.`;
  } else if (imageList.length > 0 && threadKey === null) {
    systemPrompt += `\n\n**Image upload**

Kelsie attached image(s) on the main thread. For ongoing visual inspo, suggest Visual Inspo Depot (/chat/inspiration). Do not extract palette colors here.`;
  }

  if (
    introBeatResolution?.beat === "8" &&
    !hasPrimaryPicksConfirm &&
    !coolorsColors &&
    threadKey === null
  ) {
    const handoff = await handleDashboardHandoffTurn({
      resolution: introBeatResolution,
      rawUserMessage,
      imageList,
      threadKey,
    });
    if (handoff) return handoff;
  }

  if (
    introBeatResolution &&
    !hasPrimaryPicksConfirm &&
    !coolorsColors &&
    threadKey === null
  ) {
    const scripted = await handleScriptedIntroTurn({
      resolution: introBeatResolution,
      rawUserMessage,
      imageList,
      threadKey,
    });
    if (scripted) return scripted;
  }

  const apiMessages: Anthropic.MessageParam[] = [];

  if (initialMessage) {
    apiMessages.push({ role: "assistant", content: initialMessage });
  }

  for (const msg of dbMessages) {
    apiMessages.push({ role: msg.role, content: msg.content });
  }

  apiMessages.push({
    role: "user",
    content: buildUserContent(userMessage, imageList),
  });

  let response = await createAnthropicMessage({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: apiMessages,
    tools,
  });

  let assistantContentBlocks = response.content;
  let assistantText = extractAssistantText(assistantContentBlocks);
  let loopCount = 0;
  const maxLoops = threadKey === null ? 5 : 3;
  let suggestFocus: { vendor: VendorKey; label: string } | null = null;
  let emailDraft: EmailDraft | null = null;
  let primaryColorPicker: PrimaryColorPicker | null = null;
  let coolorsHandoff: CoolorsHandoff | null = coolorsHandoffFromPicks;

  while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
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
      } else if (block.name === "show_primary_color_picker") {
        const input = block.input as { hint?: string };
        primaryColorPicker = { hint: input.hint };
        await setPendingPrimaryPicker(true);
        result = "Primary color picker surfaced.";
      } else if (block.name === "update_inspiration_memory") {
        const input = block.input as { markdown: string };
        await upsertInspirationMemory(input.markdown);
        result = "Visual inspo memory saved.";
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
      } else if (block.name === "draft_vendor_email") {
        const input = block.input as {
          vendor: string;
          to_email?: string;
          to_name?: string;
          subject: string;
          body: string;
          purpose: "inquiry" | "follow_up" | "hold_date" | "other";
        };

        if (!isVendorKey(input.vendor)) {
          result = "Unknown vendor.";
        } else {
          const currentData = await getWeddingData();
          const vendorEntry = currentData.vendors[input.vendor];
          const toEmail =
            input.to_email?.trim() ||
            vendorEntry?.contact?.email?.trim() ||
            null;

          if (!toEmail) {
            result =
              "No email on file for this vendor — ask Kelsie for the contact email and save it before drafting.";
          } else {
            const toName =
              input.to_name?.trim() ||
              vendorEntry?.contact?.name?.trim() ||
              vendorEntry?.name?.trim() ||
              null;

            emailDraft = {
              vendor: input.vendor,
              to: toEmail,
              toName,
              subject: input.subject,
              body: input.body,
            };

            const purposeLabel =
              input.purpose === "follow_up"
                ? "follow-up"
                : input.purpose === "hold_date"
                  ? "hold-date"
                  : input.purpose;
            const outreachNote = `Draft ${purposeLabel} email to ${toEmail} — subject: "${input.subject}"`;
            await appendVendorNote(input.vendor, outreachNote, "Outreach");

            result = "Draft ready for Kelsie.";
          }
        }
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    const updatedData = await getWeddingData();
    const updatedVendorFocus = vendorKey
      ? await buildVendorFocus(vendorKey)
      : undefined;
    const updatedInspirationMemory =
      threadKey === null || inspirationFocus
        ? await getInspirationMemory()
        : "";
    const updatedInspirationFocus = inspirationFocus
      ? { memory: updatedInspirationMemory }
      : undefined;
    const updatedSystemPrompt =
      buildSystemPrompt(
        updatedData,
        updatedVendorFocus,
        zolaContext,
        updatedInspirationFocus,
        threadKey === null ? updatedInspirationMemory : undefined
      ) + (introBeatDirective ?? "");

    response = await createAnthropicMessage({
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
    const iterationText = extractAssistantText(assistantContentBlocks);
    if (iterationText.trim()) {
      assistantText = iterationText;
    }
    loopCount++;
  }

  if (!assistantText.trim()) {
    const textOnlyResponse = await createAnthropicMessage({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `${systemPrompt}\n\n[System: Reply with visible text to Kelsie. Do not call tools on this turn.]`,
      messages: [
        ...apiMessages,
        { role: "assistant", content: assistantContentBlocks },
        { role: "user", content: TEXT_ONLY_NUDGE },
      ],
    });
    assistantContentBlocks = textOnlyResponse.content;
    assistantText = extractAssistantText(assistantContentBlocks);
  }

  if (!assistantText.trim()) {
    assistantText =
      "Sorry — I got tangled up for a second. Could you try sending that again?";
  }

  const storedMessage = storedUserMessage(rawUserMessage, imageList.length);
  await saveMessage("user", storedMessage, threadKey);
  await saveMessage("assistant", assistantText, threadKey);
  if (introBeatResolution && threadKey === null) {
    await advanceIntroUserTurn(introBeatResolution.userTurnNumber);
  }

  return NextResponse.json({
    message: assistantText,
    suggestFocus,
    emailDraft,
    primaryColorPicker,
    coolorsHandoff,
  });
}
