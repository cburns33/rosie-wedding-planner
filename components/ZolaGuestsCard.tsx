import type { ZolaAggregates } from "@/lib/zola/normalize";

function formatStaleDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * Zola-powered guests & registry card on the planning home. Aggregates only —
 * no names. Hidden entirely when there's no snapshot yet (no connect CTA).
 */
export default function ZolaGuestsCard({ data }: { data: ZolaAggregates | null }) {
  if (!data?.available || !data.rsvp) return null;

  const { rsvp, registry, profileUrl, stale, syncedAt } = data;

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs tracking-[0.15em] uppercase text-warm-light">
          Guests &amp; registry
        </span>
        {profileUrl && (
          <span className="shrink-0 text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity">
            Open Zola &rarr;
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-serif text-2xl text-warm-dark tabular-nums">
        <span>
          {rsvp.attending} <span className="text-base text-warm-mid">yes</span>
        </span>
        <span className="text-warm-light">·</span>
        <span>
          {rsvp.pending} <span className="text-base text-warm-mid">waiting</span>
        </span>
        <span className="text-warm-light">·</span>
        <span>
          {rsvp.declined} <span className="text-base text-warm-mid">no</span>
        </span>
      </div>

      {registry && (registry.giftsReceived > 0 || registry.thankYouPending > 0) && (
        <p className="mt-1.5 text-sm text-warm-mid tabular-nums">
          {registry.giftsReceived} gift{registry.giftsReceived === 1 ? "" : "s"}
          {registry.thankYouPending > 0
            ? ` · ${registry.thankYouPending} to thank`
            : ""}
        </p>
      )}

      {stale && syncedAt && (
        <p className="mt-2 text-[11px] text-warm-light">
          as of {formatStaleDate(syncedAt)} — may be a touch behind
        </p>
      )}
    </>
  );

  const className =
    "group card-interactive block rounded-2xl border border-border bg-white p-5 hover:border-blush/30";

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return <div className={className.replace("card-interactive ", "")}>{body}</div>;
}
