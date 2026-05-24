import type { WeddingState } from "@/lib/types";

const VENDOR_LABELS: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  caterer: "Caterer",
  florist: "Florist",
  dj: "DJ",
  officiant: "Officiant",
  cake: "Cake",
  hair_makeup: "Hair & Makeup",
  transportation: "Transportation",
};

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

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="font-serif text-4xl font-light text-warm-dark">Planning Overview</h1>
        <p className="text-warm-light text-sm mt-1">
          {data.timeline.confirmedDate ?? data.timeline.targetDate ?? "Date TBD"} ·{" "}
          {data.guests.estimated} guests
        </p>
      </div>

      {/* Budget */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Budget</h2>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-warm-mid text-sm">Total</span>
            <span className="font-serif text-2xl text-warm-dark">{formatCurrency(data.budget.total)}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-blush rounded-full transition-all"
              style={{ width: `${allocatedPct}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-warm-light">Allocated: {formatCurrency(totalAllocated)}</span>
            <span className={remaining < 0 ? "text-blush" : "text-sage"}>
              Remaining: {formatCurrency(remaining)}
            </span>
          </div>

          {Object.keys(data.budget.allocations).length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              {Object.entries(data.budget.allocations).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-warm-mid capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-warm-dark">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
          )}

          {data.budget.notes.length > 0 && (
            <div className="pt-2 border-t border-border">
              {data.budget.notes.map((note, i) => (
                <p key={i} className="text-warm-light text-sm">{note}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Venue */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Venue</h2>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-warm-mid text-sm">Status</span>
            <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${VENUE_STATUS_STYLES[data.venue.status]}`}>
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
                <p className="text-warm-light text-sm">{formatCurrency(data.venue.selected.cost)}</p>
              )}
            </div>
          )}

          {data.venue.shortlist.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-warm-light text-xs uppercase tracking-widest">Shortlist</p>
              {data.venue.shortlist.map((v, i) => (
                <div key={i}>
                  <p className="text-warm-dark text-sm">{v.name}</p>
                  {v.location && <p className="text-warm-light text-xs">{v.location}</p>}
                  {v.notes && <p className="text-warm-light text-xs">{v.notes}</p>}
                </div>
              ))}
            </div>
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
        </div>
      </section>

      {/* Vendors */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Vendors</h2>
        <div className="bg-white border border-border rounded-2xl divide-y divide-border">
          {Object.entries(data.vendors).map(([key, vendor]) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-warm-dark text-sm">{VENDOR_LABELS[key] ?? key}</p>
                {vendor.name && <p className="text-warm-light text-xs">{vendor.name}</p>}
                {vendor.notes && <p className="text-warm-light text-xs">{vendor.notes}</p>}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[vendor.status]}`}>
                {vendor.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Decisions */}
      {data.decisions.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-light text-warm-dark">Decisions Made</h2>
          <div className="bg-white border border-border rounded-2xl divide-y divide-border">
            {[...data.decisions].reverse().map((d, i) => (
              <div key={i} className="px-6 py-4 flex gap-4 items-start">
                <span className="text-warm-light text-xs pt-0.5 shrink-0">{d.date}</span>
                <p className="text-warm-dark text-sm">{d.decision}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aesthetic */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-light text-warm-dark">Aesthetic</h2>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-warm-mid">Style</span>
            <span className="text-warm-dark">{data.aesthetic.style ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-warm-mid">Music</span>
            <span className="text-warm-dark">{data.aesthetic.music ?? "—"}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-warm-mid">Palette</span>
            <div className="flex gap-1.5">
              {data.aesthetic.palette.map((c) => (
                <span key={c} className="text-warm-dark capitalize">
                  {c}
                </span>
              ))}
            </div>
          </div>
          {data.aesthetic.notes.map((note, i) => (
            <p key={i} className="text-warm-light">{note}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
