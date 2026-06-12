import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState, ZolaSnapshot } from "@/lib/types";

async function getWeddingData(): Promise<WeddingState> {
  const { data, error } = await getSupabase()
    .from("wedding_state")
    .select("data")
    .eq("id", 1)
    .single();
  // Surface read failures instead of silently falling back to defaults — a
  // swallowed error here would let a later upsert overwrite real state.
  if (error) {
    throw new Error(`wedding_state read failed: ${error.message}`);
  }
  return { ...DEFAULT_WEDDING_STATE, ...(data?.data as Partial<WeddingState>) };
}

/**
 * Silently fold Zola RSVP aggregates into `wedding_state.guests`. No prompts to
 * Kelsie. A `decisions[]` entry is logged only when the invited count moves
 * more than 10% from the previous snapshot.
 */
export async function reconcileWeddingState(
  snapshot: ZolaSnapshot,
  previousInvited: number | null
): Promise<void> {
  const current = await getWeddingData();
  const { invited, attending, pending, declined } = snapshot.summary;
  const now = new Date().toISOString();

  const decisions = [...current.decisions];
  if (
    previousInvited != null &&
    previousInvited > 0 &&
    invited > 0 &&
    Math.abs(invited - previousInvited) / previousInvited > 0.1
  ) {
    decisions.push({
      date: now.split("T")[0],
      decision: `Guest count shifted from ~${previousInvited} to ${invited} invited (synced from Zola).`,
    });
  }

  const updated: WeddingState = {
    ...current,
    guests: {
      ...current.guests,
      finalCount: invited > 0 ? invited : current.guests.finalCount,
      rsvpAttending: attending,
      rsvpPending: pending,
      rsvpDeclined: declined,
      lastZolaImportAt: snapshot.syncedAt,
    },
    decisions,
    integrations: {
      ...current.integrations,
      zola: {
        ...current.integrations.zola,
        syncMethod: "api",
        apiConnected: true,
        lastSyncAt: now,
        profileUrl:
          current.integrations.zola.profileUrl ??
          process.env.ZOLA_PROFILE_URL ??
          null,
      },
    },
  };

  const { error } = await getSupabase()
    .from("wedding_state")
    .upsert({ id: 1, data: updated, updated_at: now });
  // supabase-js returns errors in the response rather than throwing. Without
  // this check a rejected write (e.g. RLS denial) fails silently — the RSVP
  // counts never land and no Sentry alert fires.
  if (error) {
    throw new Error(`wedding_state upsert failed: ${error.message}`);
  }
}
