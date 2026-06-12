"use client";

interface WelcomeOverlayProps {
  onDismiss: () => void;
  dismissing: boolean;
}

export default function WelcomeOverlay({ onDismiss, dismissing }: WelcomeOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 transition-opacity duration-300"
      style={{ opacity: dismissing ? 0 : 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="absolute inset-0 bg-warm-dark/15 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md bg-white border border-border rounded-2xl p-8 sm:p-9 shadow-sm space-y-6 text-center">
        <div className="space-y-3">
          <p className="text-xs tracking-[0.2em] uppercase text-warm-light">Welcome</p>
          <h2
            id="welcome-title"
            className="font-serif text-2xl font-light text-warm-dark text-balance"
          >
            Your planning home
          </h2>
          <p className="text-sm text-warm-mid leading-relaxed text-pretty">
            This page updates as you make decisions. Up next will point you to what
            matters most right now. Ask Rosie whenever you want to talk things through.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissing}
          className="inline-flex items-center justify-center rounded-full bg-warm-dark text-cream text-xs tracking-widest uppercase px-8 py-3.5 hover:bg-blush disabled:opacity-60 transition-[background-color,opacity] duration-150"
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
