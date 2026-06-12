import * as Sentry from "@sentry/nextjs";
import { getZolaClient, ZolaAuthError } from "./client";
import {
  normalizeSnapshot,
  type RawZolaEvent,
  type RawZolaGiftTracker,
  type RawZolaBudget,
} from "./normalize";
import { getLatestSnapshot, insertSnapshot } from "./store";
import { reconcileWeddingState } from "./reconcile";

export interface SyncResult {
  ok: boolean;
  reason?: "no_token" | "auth" | "error";
  invited?: number;
  attending?: number;
}

interface EventGroup {
  events?: RawZolaEvent[];
}

/**
 * Full read-only sync: refresh session → pull RSVPs/events, gift tracker, and
 * budget → normalize → insert snapshot → reconcile guest counts. Best-effort
 * per resource; RSVP/events is the core, registry and budget are optional.
 *
 * Never throws for expected failures — returns a result and reports to Sentry
 * (scrubbed) so the home page and chat keep working on the last known data.
 */
export async function runZolaSync(): Promise<SyncResult> {
  const client = getZolaClient();
  if (!client) return { ok: false, reason: "no_token" };

  try {
    const { weddingAccountId, registryId } = await client.getContext();

    const groups = await client.get<{ data: EventGroup[] }>(
      `/v3/websites/events/wedding-accounts/${weddingAccountId}/groups`
    );
    const events: RawZolaEvent[] = (groups.data ?? []).flatMap(
      (g) => g.events ?? []
    );

    const giftTracker = registryId
      ? await safeGet<RawZolaGiftTracker>(
          client,
          `/v3/gift_tracker/${registryId}`
        )
      : null;
    const budget = await safeGet<RawZolaBudget>(client, "/v3/budgets");

    const previous = await getLatestSnapshot();
    const previousInvited = previous?.snapshot.summary.invited ?? null;

    const snapshot = normalizeSnapshot({
      events,
      giftTracker,
      budget,
      syncedAt: new Date().toISOString(),
    });

    await insertSnapshot(snapshot, "api_sync");
    await reconcileWeddingState(snapshot, previousInvited);

    return {
      ok: true,
      invited: snapshot.summary.invited,
      attending: snapshot.summary.attending,
    };
  } catch (err) {
    Sentry.captureException(err, { tags: { integration: "zola", op: "sync" } });
    return { ok: false, reason: err instanceof ZolaAuthError ? "auth" : "error" };
  }
}

/** Optional resource: log to Sentry on failure but don't fail the whole sync. */
async function safeGet<T>(
  client: NonNullable<ReturnType<typeof getZolaClient>>,
  path: string
): Promise<T | null> {
  try {
    const res = await client.get<{ data: T }>(path);
    return res.data ?? null;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { integration: "zola", op: "sync_optional" },
    });
    return null;
  }
}
