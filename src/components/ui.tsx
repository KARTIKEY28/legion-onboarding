import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { JOURNEY, stepNumber, type JourneyStepId } from "@/journey";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-ink disabled:opacity-60";

/** The one primary action on a screen. */
export function PrimaryButton({ className = "", ...props }: ComponentProps<"button">) {
  return <button className={`${primary} ${className}`} {...props} />;
}

export function PrimaryLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link className={`${primary} ${className}`} {...props} />;
}

/** Quiet secondary action. */
export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link className={`text-base text-accent underline underline-offset-2 ${className}`} {...props} />;
}

export function Screen({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-8 pb-16">{children}</main>;
}

/** One progress indicator for the whole ten-step journey. */
export function Progress({ step }: { step: JourneyStepId }) {
  const current = stepNumber(step);
  const label = JOURNEY[current - 1].label;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">
        Step {current} of {JOURNEY.length} · {label}
      </p>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={1}
        aria-valuemax={JOURNEY.length}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${JOURNEY.length}, ${label}`}
        className="flex gap-1"
      >
        {JOURNEY.map((s, i) => (
          <span key={s.id} className={`h-1 flex-1 rounded-md ${i < current ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

/** Shown while answers load from the browser, so nothing flashes empty. */
export function LoadingScreen() {
  return (
    <Screen>
      <p role="status" className="text-ink-muted">
        Loading your answers…
      </p>
    </Screen>
  );
}

/** Development-only label; never shown to a patient. Set NEXT_PUBLIC_SHOW_DEV_LABEL=1. */
export function DevLabel() {
  if (process.env.NEXT_PUBLIC_SHOW_DEV_LABEL !== "1") return null;
  return <p className="px-4 py-1 text-center text-sm text-ink-muted">Prototype · slice 4 of 8</p>;
}
