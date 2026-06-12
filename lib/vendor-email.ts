export interface MailtoFields {
  to: string;
  subject: string;
  body: string;
}

const DEFAULT_MAILTO_MAX_LENGTH = 1800;

/** Build a mailto: URL with encoded subject and body query params. */
export function buildMailtoUrl(opts: MailtoFields): string {
  const params = new URLSearchParams({
    subject: opts.subject,
    body: opts.body,
  });
  return `mailto:${opts.to}?${params.toString()}`;
}

/** Returns false when the encoded mailto URL would exceed maxLength (default 1800). */
export function canUseMailto(
  opts: MailtoFields,
  maxLength = DEFAULT_MAILTO_MAX_LENGTH
): boolean {
  return buildMailtoUrl(opts).length <= maxLength;
}

/** Copy text to the clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Format the To line for display: "Maria Chen <maria@studio.com>" or email only. */
export function formatToDisplay(to: string, toName: string | null): string {
  if (toName?.trim()) return `${toName.trim()} <${to}>`;
  return to;
}
