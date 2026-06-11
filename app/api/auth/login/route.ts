import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isEmailAllowed } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isEmailAllowed(email)) {
    return NextResponse.json(
      { error: "That email isn't on the guest list." },
      { status: 403 }
    );
  }

  const origin = new URL(req.url).origin;
  const { supabase, response } = await createRouteHandlerClient(() =>
    NextResponse.json({ ok: true })
  );

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return response;
}
