import GuideFlowerBullet from "@/components/GuideFlowerBullet";

type BulletMarker = "flower" | "dash" | "numbered";

interface GuideBulletListProps {
  items: string[];
  marker?: BulletMarker;
  startIndex?: number;
}

export default function GuideBulletList({
  items,
  marker = "flower",
  startIndex = 1,
}: GuideBulletListProps) {
  return (
    <ul className="list-none p-0 m-0 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start">
          {marker === "flower" && (
            <span
              className="mt-[0.35rem] shrink-0 size-3.5 text-blush"
              aria-hidden
            >
              <GuideFlowerBullet className="size-full" />
            </span>
          )}
          {marker === "dash" && (
            <span className="mt-[0.1rem] shrink-0 text-blush leading-5" aria-hidden>
              —
            </span>
          )}
          {marker === "numbered" && (
            <span className="font-serif text-lg text-warm-dark tabular-nums shrink-0 w-6 leading-snug">
              {startIndex + i}.
            </span>
          )}
          <span className="text-sm text-warm-mid text-pretty leading-relaxed">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
