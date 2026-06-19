"use client";

import { useState } from "react";

interface LoginFormProps {
  error?: string | null;
}

export default function LoginForm({ error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("sending");
    setMessage(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Something went wrong.");
      return;
    }

    setStatus("sent");
    setMessage(`Check your inbox — we sent a sign-in link to ${trimmed}.`);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-serif text-4xl font-light text-warm-dark text-balance">Rosie</h1>
        <p className="text-warm-light text-sm">Sign in to continue planning</p>
      </div>

      {error === "not_allowed" && (
        <p className="text-sm text-blush text-center">
          That email isn&apos;t on the guest list. Try another address.
        </p>
      )}

      {error === "auth" && (
        <p className="text-sm text-blush text-center">
          Sign-in link expired or was invalid. Request a new one below.
        </p>
      )}

      {error === "pkce" && (
        <p className="text-sm text-blush text-center leading-relaxed">
          That link opened in a different browser than where you requested it.
          Request a fresh link below, then open it in Safari (or copy the link
          into the same browser you used on the login page).
        </p>
      )}

      {error === "setup" && (
        <p className="text-sm text-blush text-center leading-relaxed">
          Auth isn&apos;t configured yet. Add{" "}
          <code className="text-warm-mid">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          and <code className="text-warm-mid">ALLOWED_EMAILS</code> to{" "}
          <code className="text-warm-mid">.env.local</code>, then restart the dev
          server. Find the publishable key in Supabase → Settings → API Keys.
        </p>
      )}

      {status === "sent" ? (
        <p className="text-sm text-warm-mid text-center leading-relaxed">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-white border border-border rounded-xl text-warm-dark placeholder:text-warm-light text-sm focus:outline-none focus:border-blush transition-colors"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full py-3 bg-blush text-white text-sm tracking-wide rounded-xl hover:bg-blush/90 active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out disabled:opacity-50 disabled:active:scale-100"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      {status === "error" && message && (
        <p className="text-sm text-blush text-center">{message}</p>
      )}
    </div>
  );
}
