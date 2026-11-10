"use client";

import { useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import { useTrackOnce } from "@/analytics/hooks";
import { AfterVisitAction, AfterVisitScreen } from "@/components/aftervisit";
import { Portrait } from "@/components/Portrait";
import { LoadingScreen } from "@/components/ui";
import { buildIcs } from "@/aftervisit/content";
import { CLINICIANS } from "@/clinicians/data";
import { nextSlots, type Slot } from "@/clinicians/schedule";
import { cardOnFileLines, changeTermsLine } from "@/payment/summary";
import { estimateFromAnswers, estimateLine } from "@/data/estimate";
import { updateAnswers, useAnswers } from "@/session/store";
import { formatCentral } from "@/time";

const NEXT_STEPS = [
  "Intake forms, so your clinician knows you before you meet (optional).",
  "An insurance check. We'll let you know if we need anything.",
  "Reminders 48 hours, 24 hours and 1 hour before your visit.",
  "Your video visit, from the link we'll show you here.",
];

export default function ConfirmationPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  const clinician = answers.selectedClinician;
  const slot = answers.selectedSlot;
  return (
    <AfterVisitScreen stepId="confirmation">
      <Confirmed
        clinicianId={clinician?.id}
        clinicianName={clinician?.name}
        slotIso={slot?.iso}
        path={answers.insurance?.path ?? "not_sure"}
        estimate={estimateLine(estimateFromAnswers(answers))}
        returning={answers.returningPatient}
      />
    </AfterVisitScreen>
  );
}

function Confirmed({
  clinicianId,
  clinicianName,
  slotIso,
  path,
  estimate,
  returning,
}: {
  clinicianId?: string;
  clinicianName?: string;
  slotIso?: string;
  path: "insured" | "self_pay" | "not_sure";
  estimate: string;
  returning?: boolean;
}) {
  useTrackOnce("confirmation.viewed", "confirmation.viewed");

  function addToCalendar() {
    if (!clinicianName || !slotIso) return;
    const ics = buildIcs(clinicianName, slotIso);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "legion-visit.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">You&apos;re booked</h1>
        <p className="text-ink-muted">Your first visit is set. Here&apos;s everything you need.</p>
      </div>

      <section aria-label="Your visit" className="flex items-start gap-3 rounded-lg bg-accent-soft p-4">
        {clinicianId && <Portrait id={clinicianId} name={clinicianName ?? "your clinician"} size={48} />}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-muted">Video visit</p>
          <p className="text-lg font-semibold">{clinicianName ?? "Your clinician"}</p>
          <p data-testid="confirmation-when" className="text-base">
            {slotIso ? formatCentral(slotIso) : "Time to be confirmed"}
          </p>
          <p data-testid="confirmation-cost" className="text-sm text-ink-muted">
            {estimate}
          </p>
          <button
            type="button"
            onClick={addToCalendar}
            className="mt-2 self-start rounded-md border border-accent px-4 py-2 text-base font-medium text-accent"
          >
            Add to calendar
          </button>
        </div>
      </section>

      {clinicianId && slotIso && <Reschedule clinicianId={clinicianId} clinicianName={clinicianName ?? "your clinician"} slotIso={slotIso} />}

      <section aria-label="Payment" className="flex flex-col gap-1 rounded-lg bg-surface p-4 text-sm text-ink-muted">
        {cardOnFileLines(path).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section aria-label="What happens next" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-lg font-semibold">What happens next</h2>
        <ol className="flex flex-col gap-2">
          {NEXT_STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink-muted">
        {returning
          ? "That email already has an account, so we'll send you a sign-in link instead of making a new one."
          : "We'll email you a link to sign in and confirm your email."}
      </p>

      <AfterVisitAction href="/visit/before">Get ready for your visit</AfterVisitAction>
    </>
  );
}

function Reschedule({ clinicianId, clinicianName, slotIso }: { clinicianId: string; clinicianName: string; slotIso: string }) {
  const now = useRef(new Date()).current;
  const [open, setOpen] = useState(false);
  const clinician = CLINICIANS.find((c) => c.id === clinicianId);
  const slots = clinician ? nextSlots(clinician, now, undefined, 5) : [];

  function openSheet() {
    setOpen(true);
    getTracker()("reschedule.opened");
  }

  function pick(slot: Slot) {
    updateAnswers({ selectedSlot: { iso: slot.iso, label: formatCentral(slot.iso) } });
    getTracker()("reschedule.completed");
    setOpen(false);
  }

  return (
    <section aria-label="Reschedule or cancel" className="flex flex-col gap-2 rounded-lg border border-line p-4">
      <p className="text-sm text-ink-muted">{changeTermsLine(slotIso)}</p>
      {!open ? (
        <button type="button" onClick={openSheet} className="self-start text-accent underline underline-offset-2">
          Need to change it? Reschedule or cancel
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Pick a new time with {clinicianName}</p>
          {slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.iso}
                  type="button"
                  onClick={() => pick(slot)}
                  className="min-h-11 rounded-md border border-accent bg-accent-soft px-3 py-2 text-sm font-medium"
                >
                  {formatCentral(slot.iso)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No other openings in the next two weeks. Message your care team to cancel.</p>
          )}
          <button type="button" onClick={() => setOpen(false)} className="self-start text-sm text-accent underline underline-offset-2">
            Keep my current time
          </button>
        </div>
      )}
    </section>
  );
}
