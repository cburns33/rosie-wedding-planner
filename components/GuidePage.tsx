import Link from "next/link";
import Nav from "@/components/Nav";
import GuideBulletList from "@/components/GuideBulletList";
import {
  GUIDE_LEAD,
  GUIDE_PAGE_TITLE,
  GUIDE_SECTIONS,
  type GuideSection,
} from "@/lib/guide-content";

function SectionBlock({ section, delay }: { section: GuideSection; delay: number }) {
  return (
    <div
      className="briefing-item space-y-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="font-script text-4xl sm:text-[2.75rem] leading-tight text-warm-dark text-balance">
        {section.title}
      </h2>

      {section.paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-warm-mid leading-relaxed text-pretty max-w-prose">
          {p}
        </p>
      ))}

      {section.bullets && (
        <GuideBulletList
          items={section.bullets}
          marker={section.bulletsStyle ?? "flower"}
        />
      )}

      {section.chips && (
        <div className="flex flex-wrap gap-2">
          {section.chips.map((chip) => (
            <span
              key={chip}
              className="text-xs px-3 py-1.5 rounded-full bg-sage-pale text-warm-dark border border-sage/15"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {section.callout && (
        <div className="rounded-2xl bg-sage-pale border border-sage/30 p-5 sm:p-6 space-y-2">
          <p className="text-sm text-warm-mid leading-relaxed text-pretty">
            {section.callout.body}
          </p>
        </div>
      )}

      {section.link && (
        <Link
          href={section.link.href}
          className="text-sm text-blush hover:underline"
        >
          {section.link.label}
        </Link>
      )}
    </div>
  );
}

export default function GuidePage() {
  return (
    <>
      <Nav />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12 pb-28 space-y-12">

          {/* Hero */}
          <div className="text-center space-y-3">
            <p className="text-xs tracking-[0.2em] uppercase text-warm-light">
              How this works
            </p>
            <h1 className="font-serif text-3xl font-light text-warm-dark text-balance">
              {GUIDE_PAGE_TITLE}
            </h1>
          </div>

          {/* Lead card */}
          <div className="rounded-2xl bg-blush-pale p-6 sm:p-7 shadow-[0_0_0_1px_rgba(44,40,37,0.06),0_8px_32px_rgba(44,40,37,0.06)]">
            <p className="text-sm text-warm-dark leading-relaxed text-pretty">
              {GUIDE_LEAD}
            </p>
          </div>

          {/* Quick map */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { href: "/", title: "Home", detail: "Your planning dashboard" },
              { href: "/chat", title: "Ask Rosie", detail: "Talk through anything" },
              {
                href: "/chat/inspiration",
                title: "Visual Inspo Depot",
                detail: "Save screenshots and mood boards",
              },
            ].map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="card-interactive rounded-2xl border border-border bg-white p-5 min-h-[7rem] flex flex-col gap-1.5"
              >
                <span className="text-sm font-medium text-warm-dark">
                  {tile.title}
                </span>
                <span className="text-xs text-warm-light leading-snug">
                  {tile.detail}
                </span>
              </Link>
            ))}
          </div>

          {/* Content sections */}
          {GUIDE_SECTIONS.map((section, i) => (
            <SectionBlock
              key={section.id}
              section={section}
              delay={i * 50}
            />
          ))}

          {/* Footer CTA */}
          <div className="flex flex-col items-center space-y-4 pt-4">
            <Link
              href="/chat"
              className="rounded-full bg-warm-dark text-cream text-xs tracking-widest uppercase px-8 py-3.5 min-h-10 inline-flex items-center active:scale-[0.96] transition-[transform,background-color] duration-150 hover:bg-blush"
            >
              Ask Rosie
            </Link>
            <Link
              href="/"
              className="inline-flex items-center min-h-10 px-1 text-sm text-warm-mid hover:text-warm-dark"
            >
              Go to Home
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
