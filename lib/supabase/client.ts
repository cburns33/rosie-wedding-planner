import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl } from "@/lib/supabase-url";
import { getSupabaseAnonKey } from "@/lib/supabase-env";

export function createAuthClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
