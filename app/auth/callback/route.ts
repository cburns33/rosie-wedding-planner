import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isEmailAllowed } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { supabase, response } = await createRouteHandlerClient(() =>
    NextResponse.redirect(`${origin}${next}`)
  );

  const authResult = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });

  if (authResult.error || !authResult.data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (!isEmailAllowed(authResult.data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  return response;
}
