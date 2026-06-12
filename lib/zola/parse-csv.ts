import type { ZolaSnapshot } from "@/lib/types";
import type { ZolaSnapshotSource } from "./store";

/**
 * Chase-only fallback: parse a Zola CSV export into the same `ZolaSnapshot`
 * shape the API path produces. Two export kinds are supported, auto-detected
 * from cell contents (NOT headers — Zola names each event's RSVP column after
 * the event, so headers like "Wedding" / "Rehearsal Dinner" are unreliable):
 *
 *  - **RSVP export** (Track RSVPs → Export): columns are grouped into a block
 *    per event — the event's status column ("No Response" / "Attending" /
 *    "Declined"), named after the event, followed by that event's optional
 *    "Meal Choice" and custom-question columns. Several events → several blocks
 *    (and several identically-named "Meal Choice" columns). We build per-event
 *    counts, tie each meal column to its block, and use the largest event as
 *    the headline summary (its meal choices feed the caterer focus).
 *  - **Guest list / upload** (columns: Name, Plus One, Additional Guest N…):
 *    no RSVP statuses → fills invited + households, everyone counted pending.
 *
 * Aggregates only — names are read to count rows and are never stored.
 */

export class CsvParseError extends Error {}

export interface ParsedCsv {
  snapshot: ZolaSnapshot;
  source: ZolaSnapshotSource;
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function classifyRsvp(value: string): "attending" | "declined" | "pending" {
  const v = value.trim().toLowerCase();
  if (!v) return "pending";
  // Match "no response" / "awaiting" before the generic "no" below, otherwise
  // "No Response" is misread as a decline.
  if (/no response|not responded|no reply|awaiting|pending|^invited$/.test(v)) {
    return "pending";
  }
  if (/attending|accepted?|coming|will attend|confirm|\byes\b/.test(v)) {
    return "attending";
  }
  if (/decline|regret|not attending|will not|\bno\b/.test(v)) return "declined";
  return "pending";
}

/** A "Plus One" / "Additional Guest" cell counts a person unless it's a no. */
function cellCountsAsGuest(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return !/^(no|none|n\/a|0|false)$/.test(v);
}

// Strong RSVP-status tokens, used only to *detect* which columns are event
// RSVP columns. Excludes bare "yes"/"no" so a guest-list "Plus One" column
// (names or "Yes") is not mistaken for an event.
const RSVP_DETECT =
  /no response|not responded|attending|declined?|accepted?|regrets?|not attending|awaiting|coming/i;
const MEAL_HEADER = /meal|entr|dinner|food/;
// CSV exports only carry the event *name* (no type), so the headline event is
// preferred by name when it reads like the wedding/reception/ceremony.
const MAIN_EVENT_NAME = /wedding|reception|ceremony/i;

/**
 * Find the event RSVP columns by content. The stable "Meal Choice" column and
 * blank/free-text custom-question columns are excluded. Returns one index per
 * event (an export can contain several events).
 */
function detectEventColumns(rows: string[][], headerLower: string[]): number[] {
  const dataRows = rows.slice(1);
  if (dataRows.length === 0) return [];
  const colCount = rows[0].length;
  const cols: number[] = [];

  for (let col = 0; col < colCount; col++) {
    if (MEAL_HEADER.test(headerLower[col] ?? "")) continue;
    let nonEmpty = 0;
    let matches = 0;
    for (const row of dataRows) {
      const cell = (row[col] ?? "").trim();
      if (!cell) continue;
      nonEmpty++;
      if (RSVP_DETECT.test(cell)) matches++;
    }
    if (nonEmpty > 0 && matches / nonEmpty >= 0.5) cols.push(col);
  }
  return cols;
}

function parseRsvpExport(
  rows: string[][],
  headerOriginal: string[],
  headerLower: string[],
  eventCols: number[]
): ZolaSnapshot {
  const dataRows = rows.slice(1);
  const colCount = rows[0].length;

  // Each event owns the columns from its status column up to the next event's
  // status column, so a "Meal Choice" column is tied to the event it follows.
  const events = eventCols.map((col, i) => {
    const blockEnd = i + 1 < eventCols.length ? eventCols[i + 1] : colCount;
    let mealIdx = -1;
    for (let c = col + 1; c < blockEnd; c++) {
      if (MEAL_HEADER.test(headerLower[c] ?? "")) {
        mealIdx = c;
        break;
      }
    }

    let attending = 0;
    let declined = 0;
    let pending = 0;
    const choices: Record<string, number> = {};
    for (const row of dataRows) {
      const cell = (row[col] ?? "").trim();
      if (!cell) continue; // blank = not invited to this event
      const status = classifyRsvp(cell);
      if (status === "attending") attending++;
      else if (status === "declined") declined++;
      else pending++;

      if (mealIdx !== -1) {
        const meal = (row[mealIdx] ?? "").trim();
        if (meal && !/no response|not responded/i.test(meal)) {
          choices[meal] = (choices[meal] ?? 0) + 1;
        }
      }
    }
    const name = (headerOriginal[col] ?? "Event").trim() || "Event";
    return {
      name,
      attending,
      declined,
      pending,
      choices,
      isMain: MAIN_EVENT_NAME.test(name),
    };
  });

  // Headline = the event named like the wedding/reception, else the one with
  // the largest invited total.
  const headline = events.reduce<(typeof events)[number] | null>((best, e) => {
    if (!best) return e;
    if (e.isMain !== best.isMain) return e.isMain ? e : best;
    const total = e.attending + e.declined + e.pending;
    const bestTotal = best.attending + best.declined + best.pending;
    return total > bestTotal ? e : best;
  }, null);

  const summary = {
    invited: headline
      ? headline.attending + headline.declined + headline.pending
      : 0,
    attending: headline?.attending ?? 0,
    declined: headline?.declined ?? 0,
    pending: headline?.pending ?? 0,
    households: 0,
  };

  // Meals from the headline (catering-relevant) event. If it collected none —
  // e.g. meal preferences were set on a different event — fall back to the
  // single event with the most meal selections, so real data isn't dropped.
  let mealChoices: Record<string, number> = headline?.choices ?? {};
  if (Object.keys(mealChoices).length === 0) {
    const withMeals = events
      .map((e) => ({
        choices: e.choices,
        count: Object.values(e.choices).reduce((s, n) => s + n, 0),
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
    if (withMeals.length > 0) mealChoices = withMeals[0].choices;
  }
  const meals =
    Object.keys(mealChoices).length > 0 ? { choices: mealChoices } : undefined;

  return {
    summary,
    events:
      events.length > 0
        ? events.map(({ name, attending, declined, pending }) => ({
            name,
            attending,
            declined,
            pending,
          }))
        : undefined,
    meals,
    syncedAt: new Date().toISOString(),
  };
}

function parseGuestList(
  rows: string[][],
  headerLower: string[],
  nameIdx: number
): ZolaSnapshot {
  const plusOneIdx = headerLower.findIndex((h) => /plus[\s-]?one|guest of/.test(h));
  const additionalIdxs = headerLower
    .map((h, i) => (/additional guest/.test(h) ? i : -1))
    .filter((i) => i !== -1);

  let invited = 0;
  let households = 0;

  for (const dataRow of rows.slice(1)) {
    const primary = (dataRow[nameIdx] ?? "").trim();
    if (!primary) continue;
    households++;
    invited++;
    if (plusOneIdx !== -1 && cellCountsAsGuest(dataRow[plusOneIdx] ?? "")) {
      invited++;
    }
    for (const idx of additionalIdxs) {
      if (cellCountsAsGuest(dataRow[idx] ?? "")) invited++;
    }
  }

  // A guest list tells us who's invited, not who's replied — count all pending.
  return {
    summary: { invited, attending: 0, declined: 0, pending: invited, households },
    syncedAt: new Date().toISOString(),
  };
}

export function parseZolaCsv(text: string): ParsedCsv {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new CsvParseError("This file has no guest rows. Export from Zola first.");
  }

  const headerOriginal = rows[0];
  const headerLower = rows[0].map((h) => h.trim().toLowerCase());

  const eventCols = detectEventColumns(rows, headerLower);
  if (eventCols.length > 0) {
    return {
      snapshot: parseRsvpExport(rows, headerOriginal, headerLower, eventCols),
      source: "csv_rsvp",
    };
  }

  const nameIdx = headerLower.findIndex((h) =>
    /^name$|first name|guest name|full name/.test(h)
  );
  if (nameIdx !== -1) {
    return {
      snapshot: parseGuestList(rows, headerLower, nameIdx),
      source: "csv_guests",
    };
  }

  throw new CsvParseError(
    "Couldn't recognize this as a Zola RSVP export or guest list (no RSVP statuses or name column found)."
  );
}
