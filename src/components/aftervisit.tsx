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
  formsComplete: false,
  visitComplete: false,
};

/** The demo state, with defaults filled in. */
export function useDemo(): Required<DemoState> {
  const answers = useAnswers();
  return { ...DEMO_DEFAULTS, ...(answers?.demo ?? {}) };
}

export function setDemo(patch: Partial<DemoState>) {
  updateAnswers({ demo: { ...DEMO_DEFAULTS, ...getAnswers().demo, ...patch } });
}

/** Screen wrapper: proposal label, content, next step and the dev panel. */
export function AfterVisitScreen({ stepId, children }: { stepId: AfterVisitStepId; children: ReactNode }) {
  const index = AFTER_VISIT_STEPS.findIndex((s) => s.id === stepId);
  const next = AFTER_VISIT_STEPS[index + 1];
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-6 pb-4 md:pb-16">
      <ProposalLabel />
      <p className="text-sm text-ink-muted">
        After your visit is booked · step {index + 1} of {AFTER_VISIT_STEPS.length}
      </p>
      {children}
      {next && (
        <Link
          href={next.path}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-ink md:w-auto"
        >
          Next: {next.label}
        </Link>
      )}
      <DevPanel />
    </main>
  );
}

const CLOCKS: { id: DemoState["clock"]; label: string }[] = [
  { id: "far", label: "Just booked" },
  { id: "48h", label: "48h before" },
  { id: "24h", label: "24h before" },
  { id: "1h", label: "1h before" },
  { id: "visit", label: "Visit time" },
];

const INSURANCE_STATES: { id: DemoState["insuranceState"]; label: string }[] = [
  { id: "checking", label: "Checking" },
  { id: "confirmed", label: "Confirmed" },
  { id: "more_info", label: "Needs info" },
];

/** Dev-only control panel for the demo. Hidden in production (and to patients). */
export function DevPanel() {
  const demo = useDemo();
  if (process.env.NEXT_PUBLIC_SHOW_DEV_LABEL !== "1") return null;
  return (
    <section aria-label="Demo controls (dev only)" className="flex flex-col gap-3 rounded-md border border-dashed border-line p-3 text-sm">
      <p className="font-medium text-ink-muted">Demo controls — dev only, never shown to patients</p>
      <DevRow label="Time">
        {CLOCKS.map((c) => (
          <DevChip key={c.id} active={demo.clock === c.id} onClick={() => setDemo({ clock: c.id })}>
            {c.label}
          </DevChip>
        ))}
      </DevRow>
      <DevRow label="Insurance">
        {INSURANCE_STATES.map((s) => (
          <DevChip key={s.id} active={demo.insuranceState === s.id} onClick={() => setDemo({ insuranceState: s.id })}>
            {s.label}
          </DevChip>
        ))}
      </DevRow>
      <DevRow label="Forms">
        <DevChip active={demo.formsComplete} onClick={() => setDemo({ formsComplete: !demo.formsComplete })}>
          {demo.formsComplete ? "Complete" : "Not done"}
        </DevChip>
      </DevRow>
      <DevRow label="Visit">
        <DevChip active={demo.visitComplete} onClick={() => setDemo({ visitComplete: !demo.visitComplete })}>
          {demo.visitComplete ? "Completed" : "Not yet"}
        </DevChip>
      </DevRow>
    </section>
  );
}

function DevRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function DevChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 rounded-full border px-3 py-1 ${active ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface"}`}
    >
      {children}
    </button>
  );
}
