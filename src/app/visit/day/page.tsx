"use client";

import { useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { visitContext } from "@/aftervisit/answers";
import { AfterVisitScreen, useDemo } from "@/components/aftervisit";
import { LoadingScreen } from "@/components/ui";
import { useAnswers } from "@/session/store";
import { formatCentral } from "@/time";

const CHECKS = ["Camera", "Microphone", "Connection"] as const;

export default function DayOfVisitPage() {
  const answers = useAnswers();
  const demo = useDemo();
  if (!answers) return <LoadingScreen />;
  const ctx = visitContext(answers, demo);
  return (
    <AfterVisitScreen stepId="day">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Day of your visit</h1>
        <p className="text-ink-muted">
          {ctx ? `Your visit with ${ctx.clinicianName} is ${formatCentral(ctx.slotIso)}.` : "Your visit is coming up."}
        </p>
      </div>
      <DeviceCheck problem={demo.deviceProblem} />
      <JoinVisit />
    </AfterVisitScreen>
  );
}

function DeviceCheck({ problem }: { problem: boolean }) {
  const [ran, setRan] = useState(false);
  // The problem state is driven by the demo bar's "Device" toggle, not a patient control.
  const failed = ran && problem;
  return (
    <section aria-label="Device check" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 className="text-lg font-semibold">Quick device check</h2>
      <ul className="flex flex-col gap-2">
        {CHECKS.map((c) => (
          <li key={c} className="flex items-center justify-between">
            <span>{c}</span>
            <span className={ran && !failed ? "text-accent" : "text-ink-muted"}>
              {ran ? (failed ? "Needs attention" : "Ready") : "Not checked"}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setRan(true)}
        className="self-start rounded-md border border-accent px-4 py-2 text-base font-medium text-accent"
      >
        Run check
      </button>
      {failed && (
        <p role="status" className="rounded-md bg-danger-soft px-4 py-2 text-sm">
          Something isn&apos;t working? You can still join. Our team can help, or you can switch to a phone call. We won&apos;t let a
          device problem stop your visit.
        </p>
      )}
    </section>
  );
}

function JoinVisit() {
  const [joined, setJoined] = useState(false);
  function join() {
    setJoined(true);
    trackOnce("visit.joined", "visit.joined");
  }
  return (
    <section aria-label="Join your visit" className="flex flex-col gap-3 rounded-lg bg-accent-soft p-4">
      <h2 className="text-lg font-semibold">Ready when you are</h2>
      {joined ? (
        <p role="status" className="rounded-md bg-canvas px-4 py-3">You&apos;ve joined. Your clinician will be with you shortly.</p>
      ) : (
        <button
          type="button"
          onClick={join}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-ink"
        >
          Join video visit
        </button>
      )}
    </section>
  );
}
