import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig } from "@/lib/supabase-env";
import { isEmailAllowed } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/mockups"];

// Chase-only integration routes that self-protect with CRON_SECRET (Bearer
// token). They must skip magic-link auth so Vercel Cron and manual server
// calls — which carry no Supabase session cookie — can reach them.
const SECRET_PROTECTED_PREFIXES = [
  "/api/cron/",
  "/api/integrations/zola/sync",
  "/api/integrations/zola/import",
  "/api/sentry/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local-only escape hatch so the app can be viewed without magic-link sign-in.
  // Hard-gated to non-production so it can never weaken the deployed app even if
  // the env var leaks. Remove DISABLE_AUTH from .env.local to re-enable auth.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DISABLE_AUTH === "true"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  if (SECRET_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authConfig = getSupabaseAuthConfig();
  if (!authConfig) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = "/login";
    setupUrl.searchParams.set("error", "setup");
    return NextResponse.redirect(setupUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    authConfig.url,
    authConfig.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isPublic) {
    if (user?.email && isEmailAllowed(user.email) && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.email || !isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
