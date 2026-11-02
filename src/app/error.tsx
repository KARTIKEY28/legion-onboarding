"use client";

// Shown when a screen fails to load. Crisis help stays above it in the layout.
export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">Something went wrong on our side</h1>
      <p className="text-ink-muted">Nothing you entered was lost. You can try this step again.</p>
      <button
        type="button"
        onClick={reset}
        className="self-start rounded-md bg-accent px-6 py-3 font-medium text-accent-ink"
      >
        Try again
      </button>
    </main>
  );
}
