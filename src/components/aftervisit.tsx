"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getAnswers, updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

/**
 * Shared chrome for the after-payment slice (slice 7), the author's design
 * proposal. Every screen carries a persistent "Design proposal" label, an
 * optional dev panel (hidden unless NEXT_PUBLIC_SHOW_DEV_LABEL=1, so patients
 * never see it), and a simple walk between the six screens.
 */

export const AFTER_VISIT_STEPS = [
  { id: "confirmation", label: "Booking confirmed", path: "/confirmation" },
  { id: "before", label: "Before your visit", path: "/visit/before" },
  { id: "reminders", label: "Reminders", path: "/visit/reminders" },
  { id: "email", label: "Pre-visit email", path: "/visit/email" },
  { id: "day", label: "Day of the visit", path: "/visit/day" },
  { id: "complete", label: "Visit complete", path: "/visit/complete" },
] as const;

export type AfterVisitStepId = (typeof AFTER_VISIT_STEPS)[number]["id"];

/** The persistent proposal label. Shown on every after-payment screen. */
export function ProposalLabel() {
  return (
    <p className="rounded-md bg-surface px-3 py-1 text-center text-sm text-ink-muted" data-testid="proposal-label">
      Design proposal, not Legion&apos;s current experience
    </p>
  );
}

type DemoState = NonNullable<SessionAnswers["demo"]>;

export const DEMO_DEFAULTS: Required<DemoState> = {
  clock: "far",
  insuranceState: "checking",
  costOutcome: "estimated",
  formsComplete: false,
  visitComplete: false,
  slotTaken: false,
  deviceProblem: false,
};

/** The demo state, with defaults filled in. */
export function useDemo(): Required<DemoState> {
  const answers = useAnswers();
  return { ...DEMO_DEFAULTS, ...(answers?.demo ?? {}) };
}

export function setDemo(patch: Partial<DemoState>) {
  updateAnswers({ demo: { ...DEMO_DEFAULTS, ...getAnswers().demo, ...patch } });
}

/**
 * Screen wrapper for the after-payment proposal: the persistent proposal label
 * and the content. Navigation between the six screens and all dev controls live
 * in the global DemoBar (dev only), never on the patient screen itself.
 */
export function AfterVisitScreen({ stepId, children }: { stepId: AfterVisitStepId; children: ReactNode }) {
  // stepId is kept for the DemoBar to highlight the current screen via the URL.
  void stepId;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-6 pb-4 md:pb-16">
      <ProposalLabel />
      {children}
    </main>
  );
}

/** The single primary action for an after-payment screen. */
export function AfterVisitAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-ink hover:bg-accent-dark md:w-auto md:self-start"
    >
      {children}
    </Link>
  );
}
