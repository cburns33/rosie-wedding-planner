import Link from "next/link";
import type { WeddingState } from "@/lib/types";
import type { ZolaAggregates } from "@/lib/zola/normalize";
import type { InspirationCardSummary } from "@/lib/inspiration";
import Dashboard from "./Dashboard";
import ZolaGuestsCard from "./ZolaGuestsCard";
import YourVibeCard from "./YourVibeCard";
import {
  weeksToGo,
  dateLabel,
  formatDecisionDate,
  getUpNext,
  getMilestones,
  getSummary,
  type Milestone,
} from "@/lib/planning-utils";

function countdownLabel(weeks: number | null): string {
  if (weeks == null) return "Let's set your date";
  if (weeks === 0) return "It's almost here";
  return `${weeks} weeks to go`;
}

const DOT_STYLES: Record<Milestone["status"], string> = {
  done: "bg-sage border-sage",
  active: "bg-white border-blush ring-2 ring-blush/30 milestone-dot-active",
  upcoming: "bg-cream border-border",
};

const MILESTONE_LABEL_STYLES: Record<Milestone["status"], string> = {
  done: "text-warm-dark",
  active: "text-blush",
  upcoming: "text-warm-light",
};

const CARD_INTERACTIVE =
  "card-interactive block rounded-2xl border border-border bg-white";

interface PlanningHomeProps {
  data: WeddingState;
  zola?: ZolaAggregates | null;
  inspirationSummary?: InspirationCardSummary;
}

export default function PlanningHome({
  data,
  zola,
  inspirationSummary = { observationCount: 0, latestPreview: null },
}: PlanningHomeProps) {
  const weeks = weeksToGo(data);
  const upNext = getUpNext(data);
  const milestones = getMilestones(data);
  const summary = getSummary(data);

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-12 pb-28 md:pb-12 space-y-12">
        {/* Hero */}
        <header
          className="briefing-item text-center space-y-3"
          style={{ animationDelay: "0ms" }}
        >
          <p className="text-xs tracking-[0.2em] uppercase text-warm-light tabular-nums">
            {dateLabel(data)}
            {data.location.hub ? ` · ${data.location.hub}` : ""}
          </p>
          <h1 className="font-script text-5xl sm:text-6xl text-warm-dark leading-tight">
            Kelsie &amp; Hank
          </h1>
          <p className="font-serif text-2xl font-light text-blush tabular-nums">
            {countdownLabel(weeks)}
          </p>
        </header>

        <YourVibeCard aesthetic={data.aesthetic} />

        {/* Up next — entire card is the action */}
        <section
          id="up-next"
          className="briefing-item space-y-3 scroll-mt-24"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-xs tracking-[0.2em] uppercase text-warm-light">
            Up next
          </h2>
          <Link
            href={upNext.href}
            className="group card-interactive block bg-blush-pale border border-blush/20 rounded-2xl p-6 sm:p-7 hover:border-blush/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="space-y-1.5">
                <p className="font-serif text-2xl font-light text-warm-dark text-balance group-hover:text-blush transition-colors">
                  {upNext.title}
                </p>
                <p className="text-warm-mid text-sm leading-relaxed max-w-md">
                  {upNext.detail}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-warm-dark text-cream text-xs tracking-widest uppercase pl-6 pr-5 py-3.5 group-hover:bg-blush transition-[background-color] duration-150">
                {upNext.cta}
              </span>
            </div>
          </Link>
        </section>

        {/* Milestones */}
        <section
          className="briefing-item space-y-5"
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="text-xs tracking-[0.2em] uppercase text-warm-light">
            Progress
          </h2>
          <div className="bg-white border border-border rounded-2xl px-6 py-8">
            <div className="flex items-start justify-between">
              {milestones.map((m, i) => (
                <div key={m.label} className="flex-1 flex flex-col items-center">
                  <div className="relative w-full flex items-center justify-center">
                    {i > 0 && (
                      <span className="absolute right-1/2 top-1/2 -translate-y-1/2 w-full h-px bg-border" />
                    )}
                    <span
                      className={`relative z-[1] w-3.5 h-3.5 rounded-full border-2 ${DOT_STYLES[m.status]}`}
                    />
                  </div>
                  {m.status === "active" && m.href ? (
                    <Link
                      href={m.href}
                      className="group mt-3 flex flex-col items-center text-center"
                    >
                      <p
                        className={`text-sm ${MILESTONE_LABEL_STYLES[m.status]} group-hover:underline decoration-blush/40 underline-offset-2`}
                      >
                        {m.label}
                      </p>
                      {m.note && (
                        <p className="mt-0.5 text-[11px] text-warm-light tabular-nums">
                          {m.note}
                        </p>
                      )}
                      <span className="mt-1.5 text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.cta} &rarr;
                      </span>
                    </Link>
                  ) : (
                    <>
                      <p
                        className={`mt-3 text-sm text-center ${MILESTONE_LABEL_STYLES[m.status]}`}
                      >
                        {m.label}
                      </p>
                      {m.note && (
                        <p className="mt-0.5 text-[11px] text-warm-light text-center tabular-nums">
                          {m.note}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section
          className="briefing-item grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ animationDelay: "300ms" }}
        >
          <VisualInspoDepotCard summary={inspirationSummary} />

          <SummaryCard
            label="Vendors booked"
            href="#vendors"
            footnote="See vendors below"
          >
            <span className="font-serif text-2xl text-warm-dark tabular-nums">
              {summary.bookedVendors}
              <span className="text-warm-light text-lg">
                {" "}
                / {summary.totalVendors}
              </span>
            </span>
            {summary.totalVendors - summary.bookedVendors > 0 ? (
              <span className="text-warm-light text-xs tabular-nums">
                {summary.totalVendors - summary.bookedVendors} still to book
              </span>
            ) : (
              <span className="text-sage text-xs">All booked</span>
            )}
          </SummaryCard>

          <SummaryCard
            label="Latest decision"
            href="/chat"
            footnote={summary.latestDecision ? "Continue" : undefined}
          >
            {summary.latestDecision ? (
              <>
                <span className="text-warm-dark text-sm leading-snug line-clamp-2">
                  {summary.latestDecision.decision}
                </span>
                <span className="text-warm-light text-xs tabular-nums">
                  {formatDecisionDate(summary.latestDecision.date)}
                </span>
              </>
            ) : (
              <span className="text-warm-mid text-sm group-hover:text-blush transition-colors">
                Nothing decided yet — ask Rosie where to start
              </span>
            )}
          </SummaryCard>
        </section>

        {/* Guests & registry — Zola-powered (hidden until a snapshot exists) */}
        {zola?.available && (
          <section
            className="briefing-item"
            style={{ animationDelay: "350ms" }}
          >
            <ZolaGuestsCard data={zola} />
          </section>
        )}

        {/* Full details */}
        <section
          className="briefing-item space-y-6 pt-2"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-xl font-light text-warm-dark">
              The details
            </h2>
            <span className="flex-1 h-px bg-border" />
          </div>
          <Dashboard data={data} />
        </section>
      </div>

      {/* Sticky Ask Rosie on mobile */}
      <Link
        href="/chat"
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center rounded-full bg-warm-dark text-cream text-xs tracking-widest uppercase px-8 py-3.5 shadow-[0_4px_20px_rgba(44,40,37,0.18)] hover:bg-blush active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out"
      >
        Ask Rosie
      </Link>
    </>
  );
}

function VisualInspoDepotCard({ summary }: { summary: InspirationCardSummary }) {
  const className =
    "group card-interactive block rounded-2xl border border-sage/30 bg-sage-pale p-5 flex flex-col gap-1.5 min-h-[7rem] hover:border-sage/45";

  return (
    <Link href="/chat/inspiration" className={className}>
      <span className="text-xs tracking-[0.15em] uppercase text-warm-light">
        Visual Inspo Depot
      </span>
      <div className="flex flex-col gap-1 mt-auto">
        {summary.observationCount > 0 ? (
          <>
            <span className="font-serif text-2xl text-warm-dark tabular-nums">
              {summary.observationCount}
              <span className="text-warm-light text-lg">
                {" "}
                {summary.observationCount === 1 ? "look" : "looks"}
              </span>
            </span>
            {summary.latestPreview && (
              <span className="text-warm-mid text-xs leading-snug line-clamp-2">
                {summary.latestPreview}
              </span>
            )}
          </>
        ) : (
          <span className="text-warm-mid text-sm leading-snug">
            Drop Pinterest screenshots or mood board grabs anytime.
          </span>
        )}
      </div>
      <span className="text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        Show me what you&apos;ve liked lately &rarr;
      </span>
    </Link>
  );
}

function SummaryCard({
  label,
  href,
  footnote,
  children,
}: {
  label: string;
  href: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  const className = `group ${CARD_INTERACTIVE} p-5 flex flex-col gap-1.5 min-h-[7rem] hover:border-blush/30`;

  const inner = (
    <>
      <span className="text-xs tracking-[0.15em] uppercase text-warm-light">
        {label}
      </span>
      <div className="flex flex-col gap-1 mt-auto">{children}</div>
      {footnote && (
        <span className="text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          {footnote} &rarr;
        </span>
      )}
    </>
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
