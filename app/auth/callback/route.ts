import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isEmailAllowed } from "@/lib/auth";

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "magiclink"];

function isPkceVerifierError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("code verifier") ||
    lower.includes("pkce") ||
    lower.includes("both auth code and code verifier")
  );
}

async function verifyTokenHash(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>["supabase"],
  tokenHash: string,
  preferredType: EmailOtpType | null
) {
  const types = preferredType
    ? [preferredType, ...OTP_TYPES.filter((t) => t !== preferredType)]
    : OTP_TYPES;

  let lastError: { message: string } | null = null;
  for (const type of types) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!result.error && result.data.user?.email) {
      return result;
    }
    if (result.error) {
      lastError = result.error;
    }
  }

  return {
    data: { user: null, session: null },
    error: lastError ?? { message: "Invalid or expired sign-in link." },
  };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { supabase, response } = await createRouteHandlerClient(() =>
    NextResponse.redirect(`${origin}${next}`)
  );

  // Prefer token_hash (PKCE-safe for email clients / different browsers).
  const authResult = tokenHash
    ? await verifyTokenHash(supabase, tokenHash, type)
    : await supabase.auth.exchangeCodeForSession(code!);

  if (authResult.error || !authResult.data.user?.email) {
    const message = authResult.error?.message ?? "";
    if (code && !tokenHash && isPkceVerifierError(message)) {
      return NextResponse.redirect(`${origin}/login?error=pkce`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (!isEmailAllowed(authResult.data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  return response;
}
