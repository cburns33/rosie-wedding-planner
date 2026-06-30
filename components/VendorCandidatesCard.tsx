"use client";

import { useState } from "react";
import type { VendorCandidate, VendorCandidates } from "@/lib/types";

interface VendorCandidatesCardProps {
  data: VendorCandidates;
  onSave: (candidate: VendorCandidate) => void;
  savingUrls: Set<string>;
  savedUrls: Set<string>;
}

export default function VendorCandidatesCard({
  data,
  onSave,
  savingUrls,
  savedUrls,
}: VendorCandidatesCardProps) {
  if (data.items.length === 0) return null;

  return (
    <div className="flex justify-start w-full">
      <div className="w-full max-w-[85%] rounded-2xl border border-border bg-white shadow-[0_0_0_1px_rgba(44,40,37,0.04),0_4px_16px_rgba(44,40,37,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-cream/60">
          <p className="text-[11px] tracking-widest uppercase text-warm-light">
            A few options
          </p>
        </div>

        <div className="flex flex-col divide-y divide-border">
          {data.items.map((candidate) => (
            <CandidateRow
              key={candidate.url}
              candidate={candidate}
              onSave={() => onSave(candidate)}
              saving={savingUrls.has(candidate.url)}
              saved={savedUrls.has(candidate.url)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  onSave,
  saving,
  saved,
}: {
  candidate: VendorCandidate;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [hostname] = useState(() => {
    try {
      return new URL(candidate.url).hostname.replace(/^www\./, "");
    } catch {
      return candidate.url;
    }
  });

  return (
    <div className="px-5 py-4 flex flex-col gap-2 text-sm text-warm-dark">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{candidate.name}</p>
          {candidate.location && (
            <p className="text-warm-light text-xs mt-0.5">{candidate.location}</p>
          )}
        </div>
        {candidate.priceHint && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sage-pale text-warm-dark border border-sage/20 whitespace-nowrap">
            {candidate.priceHint}
          </span>
        )}
      </div>

      {candidate.whyFits && (
        <p className="text-warm-mid leading-relaxed">{candidate.whyFits}</p>
      )}

      <a
        href={candidate.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blush hover:underline w-fit"
      >
        {hostname}
      </a>

      <div className="pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className="inline-flex items-center rounded-full bg-blush text-white text-sm px-4 py-2 min-h-10 hover:bg-blush/90 active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out disabled:opacity-60"
        >
          {saved ? "Saved" : saving ? "Saving…" : "Save to considering"}
        </button>
      </div>
    </div>
  );
}
