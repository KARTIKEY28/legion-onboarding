"use client";

import { useTrackOnce } from "@/analytics/hooks";
import { AfterVisitScreen } from "@/components/aftervisit";
import { Portrait } from "@/components/Portrait";
import { LoadingScreen, TextLink } from "@/components/ui";
import { buildIcs } from "@/aftervisit/content";
import { useAnswers } from "@/session/store";
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
        returning={answers.returningPatient}
      />
    </AfterVisitScreen>
  );
}

function Confirmed({
  clinicianId,
  clinicianName,
  slotIso,
  returning,
}: {
  clinicianId?: string;
  clinicianName?: string;
  slotIso?: string;
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
        <button
          type="button"
          onClick={addToCalendar}
          className="mt-2 self-start rounded-md border border-accent px-4 py-2 text-base font-medium text-accent"
        >
          Add to calendar
        </button>
        </div>
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

      <TextLink href="/visit/before" className="self-start">
        Get ready for your visit
      </TextLink>
    </>
  );
}
