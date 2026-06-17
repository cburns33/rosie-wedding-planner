"use client";

import { useState } from "react";
import type { EmailDraft } from "@/lib/types";
import {
  buildMailtoUrl,
  canUseMailto,
  copyToClipboard,
  formatToDisplay,
} from "@/lib/vendor-email";

interface VendorEmailDraftCardProps {
  draft: EmailDraft;
}

export default function VendorEmailDraftCard({ draft }: VendorEmailDraftCardProps) {
  const [copied, setCopied] = useState(false);
  const mailtoOk = canUseMailto({
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
  });

  async function handleCopy() {
    const ok = await copyToClipboard(draft.body);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex justify-start w-full">
      <div className="w-full max-w-[85%] rounded-2xl border border-border bg-white shadow-[0_0_0_1px_rgba(44,40,37,0.04),0_4px_16px_rgba(44,40,37,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-cream/60">
          <p className="text-[11px] tracking-widest uppercase text-warm-light">
            Draft email
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 text-sm text-warm-dark">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-warm-light mb-1">
              To
            </p>
            <p className="text-warm-mid">{formatToDisplay(draft.to, draft.toName)}</p>
          </div>

          <div>
            <p className="text-[11px] tracking-widest uppercase text-warm-light mb-1">
              Subject
            </p>
            <p className="font-medium">{draft.subject}</p>
          </div>

          <div>
            <p className="text-[11px] tracking-widest uppercase text-warm-light mb-1">
              Body
            </p>
            <div className="rounded-lg border border-border bg-cream/40 px-4 py-3 max-h-40 overflow-y-auto">
              <p className="whitespace-pre-line text-warm-mid leading-relaxed line-clamp-8">
                {draft.body}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center rounded-full bg-blush text-white text-sm px-4 py-2 min-h-10 hover:bg-blush/90 active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out"
          >
            {copied ? "Copied" : "Copy email"}
          </button>

          {mailtoOk ? (
            <a
              href={buildMailtoUrl({
                to: draft.to,
                subject: draft.subject,
                body: draft.body,
              })}
              className="inline-flex items-center rounded-full bg-blush-pale border border-blush/20 text-warm-dark text-sm px-4 py-2 min-h-10 hover:bg-blush-light active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out"
            >
              Open in email
            </a>
          ) : (
            <p className="text-xs text-warm-light">
              Email is long — copy and paste into your mail app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
