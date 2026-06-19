/** Safe ceiling for JSON POST bodies (Vercel serverless limit is ~4.5 MB). */
export const MAX_CHAT_REQUEST_BYTES = 4_000_000;

export const MAX_CHAT_IMAGE_DIMENSION = 1600;
export const JPEG_QUALITY = 0.85;

const DATA_URL_IN_TEXT_RE = /data:image\/(?:jpeg|png|webp);base64,/i;

export function messageContainsEmbeddedImage(text: string): boolean {
  return DATA_URL_IN_TEXT_RE.test(text);
}

export function estimateChatPayloadBytes(body: Record<string, unknown>): number {
  return new TextEncoder().encode(JSON.stringify(body)).length;
}

export function isAcceptableChatImageType(type: string): boolean {
  return /^image\/(jpeg|png|webp)$/i.test(type);
}

/**
 * Resize and compress a user image so base64 JSON payloads stay under platform limits.
 * Browser-only (uses canvas + createImageBitmap).
 */
export async function prepareChatImageFile(file: File): Promise<string> {
  if (!isAcceptableChatImageType(file.type)) {
    throw new Error("unsupported_type");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_CHAT_IMAGE_DIMENSION / longestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");

    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    const targetChars = Math.floor(MAX_CHAT_REQUEST_BYTES / 2);

    while (dataUrl.length > targetChars && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > targetChars) {
      throw new Error("too_large");
    }

    return dataUrl;
  } finally {
    bitmap.close();
  }
}
