"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AFTER_VISIT_STEPS, DEMO_DEFAULTS, setDemo, useDemo } from "@/components/aftervisit";
import { formatCentral } from "@/time";
import { updateAnswers } from "@/session/store";

/**
 * One demo control bar, fixed to the bottom of the screen and clearly styled as
 * non-product (dashed border, neutral grey, "Demo controls"). Collapsed by
 * default. It holds EVERYTHING that is not part of the patient experience:
 * navigation between the after-payment screens, the time / insurance / forms /
 * slot-taken / device-problem / visit-complete toggles, and a "Fill demo
 * patient" button. Shown only when NEXT_PUBLIC_SHOW_DEV_LABEL=1, so patients
 * never see it, and it is excluded from the "primary action in view" check.
 */

const CLOCKS = [
  { id: "far", label: "Just booked" },
  { id: "48h", label: "48h before" },
  { id: "24h", label: "24h before" },
  { id: "1h", label: "1h before" },
  { id: "visit", label: "Visit time" },
] as const;

const INSURANCE_STATES = [
  { id: "checking", label: "Checking" },
  { id: "confirmed", label: "Confirmed" },
  { id: "more_info", label: "Needs info" },
] as const;

/** The synthetic persona used across the demo and all screenshots. */
function fillDemoPatient() {
  const slot = new Date();
  slot.setDate(slot.getDate() + 6);
  slot.setUTCHours(15, 0, 0, 0); // ~9:00 AM Central
  const iso = slot.toISOString();
  updateAnswers({
    inTexas: "yes",
    dob: { month: "03", day: "14", year: "1992" },
    conditions: { topics: ["low_mood", "worry"], unsure: false, skipped: false },
    safety: { recentThoughts: "no" },
    needs: { availability: ["weekday_mornings"] },
    insurance: { path: "insured", payerId: "sample_insurance", memberId: "SAMPLE123" },
    notifyEmail: "alex.rivera@example.com",
    patient: { firstName: "Alex", lastName: "Rivera", phone: "(555) 010-0142" },
    selectedClinician: { id: "c1", name: "Dana Whitfield" },
    selectedSlot: { iso, label: formatCentral(iso) },
    booked: true,
  });
}

export function DemoBar() {
  const demo = useDemo();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (process.env.NEXT_PUBLIC_SHOW_DEV_LABEL !== "1") return null;

  const stepIndex = AFTER_VISIT_STEPS.findIndex((s) => s.path === pathname);

  function setSlotTaken(next: boolean) {
    setDemo({ slotTaken: next });
    try {
      document.cookie = next ? "dev_slot_taken=1; path=/" : "dev_slot_taken=; path=/; max-age=0";
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-dashed border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto w-full max-w-xl px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink-muted">
            <span aria-hidden>🛠</span> Demo controls
            {stepIndex >= 0 && (
              <span className="text-xs">
                · step {stepIndex + 1} of {AFTER_VISIT_STEPS.length}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="min-h-8 rounded-md border border-line px-3 py-1 text-sm"
          >
            {open ? "Hide" : "Flip the demo controls"}
          </button>
        </div>

        {open && (
          <div className="mt-2 flex max-h-[50vh] flex-col gap-3 overflow-y-auto pb-1 text-sm">
            <Row label="Persona">
              <button
                type="button"
                onClick={fillDemoPatient}
                className="min-h-8 rounded-full border border-accent bg-accent-soft px-3 py-1 font-medium"
              >
                Fill demo patient (Alex Rivera)
              </button>
            </Row>

            <Row label="Go to">
              {AFTER_VISIT_STEPS.map((s, i) => (
                <Link
                  key={s.id}
                  href={s.path}
                  className={`min-h-8 rounded-full border px-3 py-1 ${
                    i === stepIndex ? "border-accent bg-accent-soft font-medium" : "border-line bg-canvas"
                  }`}
                >
                  {i + 1}. {s.label}
                </Link>
              ))}
            </Row>

            <Row label="Time">
              {CLOCKS.map((c) => (
                <Chip key={c.id} active={demo.clock === c.id} onClick={() => setDemo({ clock: c.id })}>
                  {c.label}
                </Chip>
              ))}
            </Row>

            <Row label="Insurance">
              {INSURANCE_STATES.map((s) => (
                <Chip key={s.id} active={demo.insuranceState === s.id} onClick={() => setDemo({ insuranceState: s.id })}>
                  {s.label}
                </Chip>
              ))}
            </Row>

            <Row label="Forms">
              <Chip active={demo.formsComplete} onClick={() => setDemo({ formsComplete: !demo.formsComplete })}>
                {demo.formsComplete ? "Complete" : "Not done"}
              </Chip>
            </Row>

            <Row label="Slot taken">
              <Chip active={demo.slotTaken} onClick={() => setSlotTaken(!demo.slotTaken)}>
                {demo.slotTaken ? "Taken at booking" : "Available"}
              </Chip>
            </Row>

            <Row label="Device">
              <Chip active={demo.deviceProblem} onClick={() => setDemo({ deviceProblem: !demo.deviceProblem })}>
                {demo.deviceProblem ? "Simulated problem" : "Working"}
              </Chip>
            </Row>

            <Row label="Visit">
              <Chip active={demo.visitComplete} onClick={() => setDemo({ visitComplete: !demo.visitComplete })}>
                {demo.visitComplete ? "Completed" : "Not yet"}
              </Chip>
            </Row>

            <button
              type="button"
              onClick={() => {
                updateAnswers({ demo: { ...DEMO_DEFAULTS } });
                setSlotTaken(false);
              }}
              className="self-start text-xs text-accent underline underline-offset-2"
            >
              Reset demo toggles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 rounded-full border px-3 py-1 ${active ? "border-accent bg-accent-soft font-medium" : "border-line bg-canvas"}`}
    >
      {children}
    </button>
  );
}
