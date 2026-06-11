"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/client";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-8 h-16 bg-cream border-b border-border">
      <Link
        href="/"
        className="font-serif text-2xl font-light tracking-wide text-warm-dark hover:text-blush transition-colors"
      >
        Rosie
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/"
          className={`inline-flex items-center h-10 px-1 text-xs tracking-widest uppercase transition-colors ${
            pathname === "/"
              ? "text-warm-dark"
              : "text-warm-light hover:text-warm-mid"
          }`}
        >
          Home
        </Link>
        <Link
          href="/chat"
          className={`inline-flex items-center h-10 px-1 text-xs tracking-widest uppercase transition-colors ${
            pathname === "/chat"
              ? "text-warm-dark"
              : "text-warm-light hover:text-warm-mid"
          }`}
        >
          Ask Rosie
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center h-10 px-1 text-xs tracking-widest uppercase text-warm-light hover:text-warm-mid active:scale-[0.96] transition-[transform,color] duration-150 ease-out"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
