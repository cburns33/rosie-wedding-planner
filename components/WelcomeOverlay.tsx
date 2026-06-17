"use client";

interface WelcomeOverlayProps {
  onDismiss: () => void;
  dismissing: boolean;
}

export default function WelcomeOverlay({ onDismiss, dismissing }: WelcomeOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 transition-opacity duration-300 ease-out"
      style={{ opacity: dismissing ? 0 : 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="absolute inset-0 bg-warm-dark/15 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl p-8 sm:p-9 space-y-6 text-center shadow-[0_0_0_1px_rgba(44,40,37,0.06),0_8px_32px_rgba(44,40,37,0.12)]"
        style={{
          opacity: dismissing ? 0 : 1,
          transform: dismissing ? "translateY(6px)" : "translateY(0)",
          transition: "opacity 300ms ease-out, transform 300ms ease-out",
        }}
      >
        <div className="space-y-3">
          <p className="text-xs tracking-[0.2em] uppercase text-warm-light">Welcome</p>
          <h2
            id="welcome-title"
            className="font-serif text-2xl font-light text-warm-dark text-balance"
          >
            Your planning home
          </h2>
          <p className="text-sm text-warm-mid leading-relaxed text-pretty">
            This is your planning home. Up next shows where to focus. Ask Rosie when you want to talk things through.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissing}
          className="inline-flex items-center justify-center rounded-full bg-warm-dark text-cream text-xs tracking-widest uppercase px-8 py-3.5 min-h-[44px] hover:bg-blush disabled:opacity-60 active:scale-[0.96] transition-[transform,background-color,opacity] duration-150 ease-out"
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
