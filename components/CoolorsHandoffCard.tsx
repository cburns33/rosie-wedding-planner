interface CoolorsHandoffCardProps {
  url: string;
}

export default function CoolorsHandoffCard({ url }: CoolorsHandoffCardProps) {
  return (
    <div className="flex justify-start w-full">
      <div className="w-full max-w-[85%] rounded-2xl border border-border bg-white shadow-[0_0_0_1px_rgba(44,40,37,0.04),0_4px_16px_rgba(44,40,37,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-cream/60">
          <p className="text-[11px] tracking-widest uppercase text-warm-light">
            Build your palette
          </p>
          <p className="text-sm text-warm-mid mt-1">
            Your two picks are in the first slots. Shuffle the rest until it feels right.
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-blush text-white text-sm px-4 py-2.5 min-h-[44px] hover:bg-blush/90 active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out"
          >
            Open palette in Coolors
          </a>

          <ul className="text-xs text-warm-mid flex flex-col gap-1.5 list-none">
            <li>Click the lock icon above a color to keep it</li>
            <li>Press spacebar to shuffle unlocked slots</li>
            <li>
              When you love it: Export → URL, then paste that link back in chat
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
