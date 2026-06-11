import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseUrl } from "@/lib/supabase-url";
import { getSupabaseAnonKey } from "@/lib/supabase-env";

/**
 * Supabase auth in Route Handlers must attach cookies to the NextResponse,
 * not only to next/headers — otherwise PKCE state is lost before the callback.
 */
export async function createRouteHandlerClient(
  buildResponse: () => NextResponse
) {
  const cookieStore = await cookies();
  const response = buildResponse();

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}
