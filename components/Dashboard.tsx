import Link from "next/link";
import type { WeddingState } from "@/lib/types";
import { formatDecisionDateWithYear } from "@/lib/planning-utils";
import { VENDOR_LABELS, isVendorKey } from "@/lib/vendors";

const STATUS_STYLES: Record<string, string> = {
  undecided: "bg-cream text-warm-light border border-border",
  considering: "bg-mist-light text-mist border border-mist/20",
  contacted: "bg-sage-light text-sage border border-sage/20",
  booked: "bg-blush-light text-blush border border-blush/20",
};

const VENUE_STATUS_STYLES: Record<string, string> = {
  undecided: "bg-cream text-warm-light border border-border",
  shortlisted: "bg-mist-light text-mist border border-mist/20",
  booked: "bg-blush-light text-blush border border-blush/20",
};

const CARD_INTERACTIVE =
  "card-interactive block rounded-2xl border border-border bg-white hover:border-blush/30";

const ROW_HOVER =
  "group -mx-2 px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-cream transition-colors";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface DashboardProps {
  data: WeddingState;
}

export default function Dashboard({ data }: DashboardProps) {
  const totalAllocated = Object.values(data.budget.allocations).reduce(
    (sum, v) => sum + (v ?? 0),
    0
  );
  const remaining = data.budget.total - totalAllocated;
  const allocatedPct = Math.min((totalAllocated / data.budget.total) * 100, 100);

  const showVenueCta =
    data.venue.status !== "booked" && data.venue.shortlist.length === 0;

  return (
    <div className="space-y-10">
      {/* Budget */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Budget</h2>
        <Link href="/chat" className={`group ${CARD_INTERACTIVE} p-6 space-y-4`}>
          <div className="flex justify-between items-baseline">
            <span className="text-warm-mid text-sm">Total</span>
            <span className="font-serif text-2xl text-warm-dark tabular-nums">
              {formatCurrency(data.budget.total)}
            </span>
          </div>

          <div className="h-1.5 bg-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-blush rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${allocatedPct}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-warm-light tabular-nums">
              Allocated: {formatCurrency(totalAllocated)}
            </span>
            <span
              className={`tabular-nums ${remaining < 0 ? "text-blush" : "text-sage"}`}
            >
              Remaining: {formatCurrency(remaining)}
            </span>
          </div>

          {Object.keys(data.budget.allocations).length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              {Object.entries(data.budget.allocations).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-warm-mid capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-warm-dark tabular-nums">
                    {formatCurrency(val)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.budget.notes.length > 0 && (
            <div className="pt-2 border-t border-border">
              {data.budget.notes.map((note, i) => (
                <p key={i} className="text-warm-light text-sm">
                  {note}
                </p>
              ))}
            </div>
          )}

          <span className="block text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            Review budget &rarr;
          </span>
        </Link>
      </section>

      {/* Venue */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Venue</h2>
        <div className={`${CARD_INTERACTIVE} overflow-hidden hover:border-blush/30`}>
          <Link href="/chat" className="group block p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-warm-mid text-sm">Status</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full capitalize ${VENUE_STATUS_STYLES[data.venue.status]}`}
              >
                {data.venue.status}
              </span>
            </div>

            {data.venue.selected && (
              <div className="pt-2 border-t border-border">
                <p className="text-warm-dark font-medium">{data.venue.selected.name}</p>
                {data.venue.selected.location && (
                  <p className="text-warm-light text-sm">{data.venue.selected.location}</p>
                )}
                {data.venue.selected.cost && (
                  <p className="text-warm-light text-sm tabular-nums">
                    {formatCurrency(data.venue.selected.cost)}
                  </p>
                )}
              </div>
            )}

            {showVenueCta && (
              <p className="text-sm text-blush opacity-80 group-hover:opacity-100 transition-opacity">
                Start your shortlist &rarr;
              </p>
            )}

            {!showVenueCta && data.venue.status !== "booked" && (
              <span className="block text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity">
                Talk about venue &rarr;
              </span>
            )}

            <div className="pt-2 border-t border-border text-sm text-warm-mid space-y-1">
              <div className="flex justify-between">
                <span>Location</span>
                <span className="text-warm-dark">{data.location.region ?? "—"}</span>
              </div>
              {data.location.hub && (
                <div className="flex justify-between">
                  <span>Hub city</span>
                  <span className="text-warm-dark">{data.location.hub}</span>
                </div>
              )}
            </div>
          </Link>

          {data.venue.shortlist.length > 0 && (
            <div className="border-t border-border">
              <p className="px-6 pt-4 pb-2 text-warm-light text-xs uppercase tracking-widest">
                Shortlist
              </p>
              {data.venue.shortlist.map((v, i) => (
                <Link
                  key={i}
                  href="/chat"
                  className={`${ROW_HOVER} mx-4 mb-1 last:mb-3`}
                >
                  <div>
                    <p className="text-warm-dark text-sm group-hover:text-blush transition-colors">
                      {v.name}
                    </p>
                    {v.location && (
                      <p className="text-warm-light text-xs">{v.location}</p>
                    )}
                    {v.notes && <p className="text-warm-light text-xs">{v.notes}</p>}
                  </div>
                  <span
                    aria-hidden
                    className="text-warm-light text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3"
                  >
                    Discuss &rarr;
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Vendors */}
      <section id="vendors" className="space-y-4 scroll-mt-24">
        <h2 className="font-serif text-xl font-light text-warm-dark">Vendors</h2>
        <div className="bg-white border border-border rounded-2xl divide-y divide-border">
          {Object.entries(data.vendors).map(([key, vendor]) => (
            <div key={key} className="px-6 py-4">
              {(() => {
                const showShortlist =
                  vendor.shortlist.length > 0 && vendor.status === "considering";
                return isVendorKey(key) ? (
                  <Link href={`/chat/${key}`} className={ROW_HOVER}>
                    <div>
                      <p className="text-warm-dark text-sm group-hover:text-blush transition-colors">
                        {VENDOR_LABELS[key]}
                      </p>
                      {showShortlist ? (
                        <p className="text-warm-light text-xs">
                          {vendor.shortlist.map((v) => v.name).join(", ")}
                        </p>
                      ) : (
                        vendor.name && (
                          <p className="text-warm-light text-xs">{vendor.name}</p>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[vendor.status]}`}
                      >
                        {showShortlist
                          ? `${vendor.shortlist.length} in consideration`
                          : vendor.status}
                      </span>
                      <span
                        aria-hidden
                        className="text-warm-light opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform] duration-150"
                      >
                        &rarr;
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-warm-dark text-sm">{key}</p>
                      {showShortlist ? (
                        <p className="text-warm-light text-xs">
                          {vendor.shortlist.map((v) => v.name).join(", ")}
                        </p>
                      ) : (
                        vendor.name && (
                          <p className="text-warm-light text-xs">{vendor.name}</p>
                        )
                      )}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[vendor.status]}`}
                    >
                      {showShortlist
                        ? `${vendor.shortlist.length} in consideration`
                        : vendor.status}
                    </span>
                  </div>
                );
              })()}

              {vendor.shortlist.length === 0 &&
                vendor.contact &&
                (vendor.contact.name ||
                  vendor.contact.email ||
                  vendor.contact.phone) && (
                  <div className="mt-2 text-xs text-warm-light space-y-0.5 pl-0">
                    {vendor.contact.name && <p>{vendor.contact.name}</p>}
                    {vendor.contact.email && (
                      <a
                        href={`mailto:${vendor.contact.email}`}
                        className="block hover:text-blush transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.contact.email}
                      </a>
                    )}
                    {vendor.contact.phone && <p>{vendor.contact.phone}</p>}
                  </div>
                )}

              {vendor.shortlist.length === 0 &&
                (vendor.quoted_cost || vendor.booked_cost || vendor.notes) && (
                  <div className="mt-2 text-xs text-warm-light space-y-0.5">
                    {vendor.quoted_cost && !vendor.booked_cost && (
                      <p className="tabular-nums">
                        Quoted: {formatCurrency(vendor.quoted_cost)}
                      </p>
                    )}
                    {vendor.booked_cost && (
                      <p className="text-sage tabular-nums">
                        Booked: {formatCurrency(vendor.booked_cost)}
                      </p>
                    )}
                    {vendor.notes && <p>{vendor.notes}</p>}
                  </div>
                )}
            </div>
          ))}
        </div>
      </section>

      {/* Decisions */}
      {data.decisions.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-light text-warm-dark">
            Decisions made
          </h2>
          <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {[...data.decisions].reverse().map((d, i) => (
              <Link
                key={i}
                href="/chat"
                className="group flex gap-4 items-start px-6 py-4 hover:bg-cream transition-colors"
              >
                <span className="text-warm-light text-xs pt-0.5 shrink-0 tabular-nums">
                  {formatDecisionDateWithYear(d.date)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-warm-dark text-sm group-hover:text-blush transition-colors">
                    {d.decision}
                  </p>
                  <span className="text-[11px] text-blush opacity-0 group-hover:opacity-100 transition-opacity">
                    Continue &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
