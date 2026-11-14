"use client";

import { useEffect, useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { visitContext } from "@/aftervisit/answers";
import { AfterVisitScreen, useDemo } from "@/components/aftervisit";
import { LoadingScreen, secondaryClass } from "@/components/ui";
import { useAnswers } from "@/session/store";
import { formatInZone, type UsState } from "@/time";

const CHECKS = ["Camera", "Microphone", "Connection"] as const;

const STATE_NAME: Record<UsState, string> = { TX: "Texas", UT: "Utah" };

export default function DayOfVisitPage() {
  const answers = useAnswers();
  const demo = useDemo();
  if (!answers) return <LoadingScreen />;
  const ctx = visitContext(answers, demo);
  const canJoin = demo.clock === "visit"; // enabled only from 10 minutes before the visit
  const slotIso = answers.selectedSlot?.iso;
  const state = answers.state ?? "TX";
  return (
    <AfterVisitScreen stepId="day">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Day of your visit</h1>
        <p className="text-ink-muted">
          {ctx ? `Your visit with ${ctx.clinicianName} is ${formatInZone(ctx.slotIso, ctx.state)}.` : "Your visit is coming up."}
        </p>
      </div>
      <DeviceCheck problem={demo.deviceProblem} />
      <BeforeYouJoin state={state} />
      <JoinVisit canJoin={canJoin} slotIso={slotIso} state={state} />
    </AfterVisitScreen>
  );
}

type CheckState = "checking" | "ok" | "problem";

function DeviceCheck({ problem }: { problem: boolean }) {
  const [state, setState] = useState<CheckState>("checking");

  // The check runs automatically (as if after the browser permission prompt).
  useEffect(() => {
    setState("checking");
    const t = setTimeout(() => setState(problem ? "problem" : "ok"), 900);
    return () => clearTimeout(t);
  }, [problem]);

  return (
    <section aria-label="Device check" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 className="text-lg font-semibold">Device check</h2>
      <ul className="flex flex-col gap-2">
        {CHECKS.map((c) => (
          <li key={c} className="flex items-center justify-between">
            <span>{c}</span>
            <span className={state === "ok" ? "text-confirmed" : "text-ink-muted"} data-testid={`check-${c.toLowerCase()}`}>
              {state === "checking" ? "Checking…" : state === "ok" ? "Ready" : "Needs attention"}
            </span>
          </li>
        ))}
      </ul>
      {state === "problem" && (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-line bg-canvas px-4 py-3 text-sm">
          <p>
            Your camera or microphone looks blocked. In your browser&apos;s address bar, allow camera and microphone for
            this site, then try again.
          </p>
          <button
            type="button"
            onClick={() => setState("checking")}
            className={`${secondaryClass} self-start`}
          >
            Try again
          </button>
          <p className="text-ink-muted">You can still join. Our team can help, or you can switch to a phone call.</p>
        </div>
      )}
    </section>
  );
}

function BeforeYouJoin({ state }: { state: UsState }) {
  return (
    <section aria-label="Before you join" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 className="text-lg font-semibold">Before you join</h2>
      <ul className="flex flex-col gap-2">
        <li className="flex gap-2">
          <span aria-hidden className="text-accent">
            ·
          </span>
          <span>Find a private, quiet place where you can speak freely.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-accent">
            ·
          </span>
          <span>You need to be in {STATE_NAME[state]} during your visit.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-accent">
            ·
          </span>
          {/* Medications wording flagged for Legion in docs/DECISIONS.md. */}
          <span>Have a list of any medications you take, so your clinician has the full picture.</span>
        </li>
      </ul>
    </section>
  );
}

function JoinVisit({ canJoin, slotIso, state }: { canJoin: boolean; slotIso?: string; state: UsState }) {
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
      ) : canJoin ? (
        <button
          type="button"
          onClick={join}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-ink"
        >
          Join video visit
        </button>
      ) : (
        <p className="text-ink-muted">
          You can join from 10 minutes before. Your visit opens at {slotIso ? formatInZone(slotIso, state) : "your visit time"}.
        </p>
      )}
    </section>
  );
}
