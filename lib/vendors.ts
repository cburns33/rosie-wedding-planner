export const VENDOR_KEYS = [
  "photographer",
  "videographer",
  "caterer",
  "florist",
  "dj",
  "officiant",
  "cake",
  "hair_makeup",
  "transportation",
] as const;

export type VendorKey = (typeof VENDOR_KEYS)[number];

export const VENDOR_LABELS: Record<VendorKey, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  caterer: "Caterer",
  florist: "Florist",
  dj: "DJ",
  officiant: "Officiant",
  cake: "Cake",
  hair_makeup: "Hair & makeup",
  transportation: "Transportation",
};

export function isVendorKey(value: string): value is VendorKey {
  return (VENDOR_KEYS as readonly string[]).includes(value);
}

/** "Caterer" → "your caterer", "DJ" stays "DJ" → "your DJ". */
export function vendorFocusLabel(key: VendorKey): string {
  return `your ${VENDOR_LABELS[key].toLowerCase()}`;
}
