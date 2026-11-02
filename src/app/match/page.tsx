"use client";

import { useRouter } from "next/navigation";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import { updateAnswers, useAnswers } from "@/session/store";

/**
 * STUB until the real Match is built. It lets Cost and terms be reached and
 * tested. Fires no match events, so the funnel isn't polluted by fake choices.
 */
export default function MatchStub() {
  const router = useRouter();
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;

  function chooseSample() {
    updateAnswers({ selectedClinician: { id: "sample", name: "a sample clinician", sample: true } });
    router.push("/cost");
  }

  return (
    <Screen>
      <Progress step="match" />
      <p className="self-start rounded-md border border-dashed border-ink-muted px-3 py-1 text-sm text-ink-muted">
        Temporary stub · the real match arrives in the next slice
      </p>
      <h1 className="text-xl font-semibold">Your matches are on their way</h1>
      <p className="text-ink-muted">
        For now, choose a sample clinician to see the cost and terms step. No real clinician or time is booked.
      </p>
      <ActionBar backHref="/needs">
        <PrimaryButton type="button" onClick={chooseSample} className={barPrimary}>
          Choose a sample clinician
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}
