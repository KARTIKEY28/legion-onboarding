import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { JOURNEY, stepNumber, type JourneyStepId } from "@/journey";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-ink hover:bg-accent-dark disabled:opacity-60";

/** A secondary action: an outlined accent pill (lower emphasis than the primary). */
export const secondaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-accent px-5 py-2 text-base font-medium text-accent disabled:opacity-60";

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
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-8 pb-4 md:pb-16">{children}</main>;
}

/**
 * The single primary action for a screen, plus an optional Back link.
 * On mobile it is a sticky bottom bar (with safe-area padding) so the primary
 * button is always in view without scrolling; on desktop it sits inline.
 * Place it as the last child of the screen's form (or Screen).
 */
export function ActionBar({ children, backHref, backLabel = "Back" }: { children: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col items-stretch gap-2 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:mt-0 md:flex-row-reverse md:items-center md:justify-end md:gap-4 md:border-0 md:bg-transparent md:px-0 md:pt-0 md:pb-0">
      {children}
      {backHref && (
        <TextLink href={backHref} className="self-center md:self-auto">
          {backLabel}
        </TextLink>
      )}
    </div>
  );
}

/** Full-width on mobile (inside the ActionBar), auto width on desktop. */
export const barPrimary = "w-full md:w-auto";

/**
 * One progress indicator for the whole ten-step journey: a single continuous
 * fill, no step number and no percentage. The section name sits above it for
 * orientation; the step count stays in aria-valuetext for assistive tech only.
 */
export function Progress({ step }: { step: JourneyStepId }) {
  const current = stepNumber(step);
  const label = JOURNEY[current - 1].label;
  const fill = (current / JOURNEY.length) * 100;
  return (
    <div className="flex flex-col gap-2">
      <p className="micro" data-testid="progress-step">
        {label}
      </p>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={1}
        aria-valuemax={JOURNEY.length}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${JOURNEY.length}, ${label}`}
        className="h-1 w-full overflow-hidden rounded-md bg-line"
      >
        <span className="block h-full rounded-md bg-accent transition-[width] duration-300" style={{ width: `${fill}%` }} />
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

