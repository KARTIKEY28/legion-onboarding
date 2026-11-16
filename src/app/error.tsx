"use client";

/**
 * Shown when a screen throws while rendering. Crisis help stays above it (it
 * lives in the root layout), so a patient always has help and a way out: "Try
 * again" re-renders the step, "Go back" returns to the previous one. A patient
 * must never hit a blank page.
 */
export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else window.location.assign("/start");
  }
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">Something went wrong on our side</h1>
      <p className="text-ink-muted">Nothing you entered was lost. You can try this step again, or go back a step.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-accent px-6 py-3 font-medium text-accent-ink hover:bg-accent-dark"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={goBack}
          className="min-h-11 rounded-md border border-line px-6 py-3 font-medium text-ink"
        >
          Go back
        </button>
      </div>
    </main>
  );
}
