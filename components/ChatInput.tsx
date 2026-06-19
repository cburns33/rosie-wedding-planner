"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent, ClipboardEvent } from "react";
import {
  isAcceptableChatImageType,
  messageContainsEmbeddedImage,
  prepareChatImageFile,
} from "@/lib/chat-images";

const MAX_FILES = 5;

interface PendingImage {
  id: string;
  preview: string;
  dataUrl: string;
}

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  disabled?: boolean;
  allowImages?: boolean;
}

export default function ChatInput({ onSend, disabled, allowImages = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [preparingImages, setPreparingImages] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function readValue(): string {
    return textareaRef.current?.value ?? value;
  }

  function syncValueFromTextarea() {
    const next = textareaRef.current?.value ?? "";
    if (next !== value) setValue(next);
  }

  function handleSend() {
    const trimmed = readValue().trim();
    const hasImages = allowImages && images.length > 0;

    if (allowImages && messageContainsEmbeddedImage(trimmed)) {
      setAttachError("Use the attach button for screenshots — don't paste images into the text field.");
      return;
    }

    if ((!trimmed && !hasImages) || disabled || preparingImages) return;

    setAttachError(null);
    onSend(
      trimmed,
      allowImages && hasImages ? images.map((img) => img.dataUrl) : undefined
    );
    setValue("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    setValue(el.value);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function handleFocus() {
    syncValueFromTextarea();
  }

  async function addFiles(files: File[]) {
    if (!allowImages || files.length === 0) return;

    const remaining = MAX_FILES - images.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;

    setPreparingImages(true);
    setAttachError(null);

    const newImages: PendingImage[] = [];
    try {
      for (const file of toAdd) {
        if (!isAcceptableChatImageType(file.type)) {
          setAttachError("Use a JPEG, PNG, or WebP screenshot.");
          continue;
        }
        try {
          const dataUrl = await prepareChatImageFile(file);
          newImages.push({
            id: `${Date.now()}-${Math.random()}`,
            preview: dataUrl,
            dataUrl,
          });
        } catch {
          setAttachError(
            "That image couldn't be attached. Try a smaller screenshot or a different file."
          );
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages].slice(0, MAX_FILES));
      }
    } finally {
      setPreparingImages(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    await addFiles(Array.from(files));
    e.target.value = "";
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    if (!allowImages) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter((item) =>
      item.type.startsWith("image/")
    );

    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      await addFiles(files);
      return;
    }

    const pastedText = e.clipboardData.getData("text/plain");
    if (messageContainsEmbeddedImage(pastedText)) {
      e.preventDefault();
      setAttachError("Use the attach button for screenshots — don't paste images into the text field.");
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  const canSend =
    (readValue().trim().length > 0 || (allowImages && images.length > 0)) &&
    !disabled &&
    !preparingImages;

  return (
    <div className="border-t border-border bg-cream px-6 py-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        {allowImages && (
          <p className="text-xs text-warm-light leading-relaxed">
            Attach screenshots with the paperclip — don&apos;t paste images into the text field.
          </p>
        )}

        {attachError && (
          <p className="text-xs text-blush leading-relaxed" role="alert">
            {attachError}
          </p>
        )}

        {allowImages && images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt="Attachment preview"
                  className="w-14 h-14 rounded-lg object-cover outline outline-1 outline-black/10"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  disabled={disabled || preparingImages}
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 min-h-10 min-w-10 flex items-center justify-center rounded-full hover:bg-blush/10 active:scale-[0.96] transition-transform duration-150 ease-out disabled:opacity-50"
                >
                  <span className="w-5 h-5 rounded-full bg-warm-dark text-cream text-xs leading-none flex items-center justify-center">
                    ×
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          {allowImages ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || preparingImages || images.length >= MAX_FILES}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled || preparingImages || images.length >= MAX_FILES}
                aria-label="Attach inspiration image"
                className="shrink-0 h-12 w-12 flex items-center justify-center rounded-xl border border-border bg-white text-warm-mid hover:border-blush/50 hover:text-blush disabled:opacity-30 active:scale-[0.96] transition-[transform,border-color,color] duration-150 ease-out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
            </>
          ) : null}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={handleFocus}
            onPaste={handlePaste}
            disabled={disabled || preparingImages}
            placeholder={allowImages ? "Add a note, or just send the screenshot…" : "Say something…"}
            rows={1}
            className="flex-1 resize-none bg-white border border-border rounded-xl px-4 py-3 text-[15px] text-warm-dark placeholder-warm-light focus:outline-none focus:border-blush/50 transition-colors leading-relaxed"
            style={{ minHeight: "48px" }}
          />
          <button
            type="button"
            onMouseDown={syncValueFromTextarea}
            onClick={handleSend}
            disabled={disabled || preparingImages}
            aria-disabled={!canSend}
            className={`shrink-0 h-12 px-5 bg-warm-dark text-cream rounded-xl text-[13px] tracking-wide font-medium hover:bg-warm-mid active:scale-[0.96] transition-[transform,background-color,opacity] duration-150 ease-out ${
              canSend ? "" : "opacity-30 cursor-not-allowed"
            } ${disabled || preparingImages ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            {preparingImages ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
