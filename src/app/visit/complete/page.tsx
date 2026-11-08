"use client";

import { useTrackOnce } from "@/analytics/hooks";
import { AfterVisitScreen, setDemo, useDemo } from "@/components/aftervisit";
import { LoadingScreen, TextLink } from "@/components/ui";
import { selfPayPrices } from "@/facts";
import { useAnswers } from "@/session/store";

export default function VisitCompletePage() {
  const answers = useAnswers();
  const demo = useDemo();
  if (!answers) return <LoadingScreen />;
  return (
    <AfterVisitScreen stepId="complete">
      {demo.visitComplete ? <Completed /> : <Upcoming devLabel={process.env.NEXT_PUBLIC_SHOW_DEV_LABEL === "1"} />}
    </AfterVisitScreen>
  );
}

function Completed() {
  // The primary outcome of the whole funnel: a first visit, completed.
  useTrackOnce("visit.completed", "visit.completed");
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Your visit is complete</h1>
        <p className="text-ink-muted">That&apos;s the end of getting started. Here&apos;s what happens from here.</p>
      </div>
      <section aria-label="What happens next" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-lg font-semibold">What&apos;s next</h2>
        <ul className="flex flex-col gap-2">
          <li>Your clinician may share notes or next steps in your account.</li>
          <li>Follow-up visits are ${selfPayPrices.followUp.value} each. Book one whenever you&apos;re ready.</li>
          <li>You can message your care team any time between visits.</li>
        </ul>
        <TextLink href="/confirmation" className="self-start">
          Back to your booking
        </TextLink>
      </section>
    </>
  );
}

function Upcoming({ devLabel }: { devLabel: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">After your visit</h1>
        <p className="text-ink-muted">
          Once your visit happens, this is where you&apos;ll pick up. Follow-ups, notes and booking again.
        </p>
      </div>
      {devLabel && (
        <button
          type="button"
          onClick={() => setDemo({ visitComplete: true })}
          className="self-start rounded-md border border-dashed border-line px-4 py-2 text-sm text-ink-muted"
        >
          Dev: simulate completing the visit
        </button>
      )}
    </>
  );
}
