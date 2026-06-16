import {
  INSPIRATION_THREAD_KEY,
  isInspirationThreadKey,
} from "@/lib/inspiration";
import { isVendorKey, type VendorKey } from "@/lib/vendors";

export type ChatThreadKey = VendorKey | typeof INSPIRATION_THREAD_KEY | null;

export function parseChatThreadKey(raw: unknown): ChatThreadKey {
  if (typeof raw !== "string") return null;
  if (isInspirationThreadKey(raw)) return INSPIRATION_THREAD_KEY;
  if (isVendorKey(raw)) return raw;
  return null;
}

export function chatThreadIsVendor(
  key: ChatThreadKey
): key is VendorKey {
  return key !== null && isVendorKey(key);
}
