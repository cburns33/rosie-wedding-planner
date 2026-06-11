import { getSupabaseUrl } from "@/lib/supabase-url";

/** Client-safe publishable key (anon JWT or sb_publishable_...). */
export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

  if (!key) {
    throw new Error(
      "Missing Supabase publishable key. Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local (Supabase Dashboard → Settings → API Keys)."
    );
  }

  return key;
}

export function getSupabaseAuthConfig(): { url: string; key: string } | null {
  try {
    return {
      url: getSupabaseUrl(),
      key: getSupabaseAnonKey(),
    };
  } catch {
    return null;
  }
}
