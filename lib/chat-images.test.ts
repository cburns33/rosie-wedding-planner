import { describe, it, expect } from "vitest";
import {
  estimateChatPayloadBytes,
  messageContainsEmbeddedImage,
  isAcceptableChatImageType,
} from "@/lib/chat-images";

describe("chat image helpers", () => {
  it("detects embedded data URLs in message text", () => {
    expect(
      messageContainsEmbeddedImage("here is my board data:image/png;base64,abc")
    ).toBe(true);
    expect(messageContainsEmbeddedImage("just a normal message")).toBe(false);
  });

  it("accepts jpeg, png, and webp mime types", () => {
    expect(isAcceptableChatImageType("image/jpeg")).toBe(true);
    expect(isAcceptableChatImageType("image/PNG")).toBe(true);
    expect(isAcceptableChatImageType("image/gif")).toBe(false);
  });

  it("estimates JSON payload size", () => {
    const bytes = estimateChatPayloadBytes({ message: "hello", threadKey: "inspiration" });
    expect(bytes).toBeGreaterThan(20);
    expect(bytes).toBeLessThan(100);
  });
});
