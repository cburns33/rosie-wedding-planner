"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-8 h-16 bg-cream border-b border-border">
      <Link
        href="/"
        className="font-serif text-2xl font-light tracking-wide text-warm-dark hover:text-blush transition-colors"
      >
        Rosie
      </Link>

      <div className="flex items-center gap-8">
        <Link
          href="/"
          className={`text-xs tracking-widest uppercase transition-colors ${
            pathname === "/"
              ? "text-warm-dark"
              : "text-warm-light hover:text-warm-mid"
          }`}
        >
          Chat
        </Link>
        <Link
          href="/dashboard"
          className={`text-xs tracking-widest uppercase transition-colors ${
            pathname === "/dashboard"
              ? "text-warm-dark"
              : "text-warm-light hover:text-warm-mid"
          }`}
        >
          Planning
        </Link>
      </div>
    </nav>
  );
}
