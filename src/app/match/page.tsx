"use client";

import { useRouter } from "next/navigation";
import { AVAILABILITY_WINDOWS, CLINICIAN_GENDERS, LANGUAGES } from "@/clinicians/model";
import { ReflectBack } from "@/components/ReflectBack";
import { LoadingScreen, PrimaryButton, Progress, Screen, TextLink } from "@/components/ui";
import { updateAnswers, useAnswers } from "@/session/store";

/**
 * STUB until slice 5 builds the real match. It lets Cost and terms be reached
 * and tested. Fires no match events, so the funnel isn't polluted by fake choices.
 */
export default function MatchStub() {
  const router = useRouter();
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  const needs = answers.needs ?? { availability: [] };

  function chooseSample() {
    updateAnswers({ selectedClinician: { id: "sample", name: "a sample clinician", sample: true } });
    router.push("/cost");
  }

  return (
    <Screen>
      <ReflectBack
        input={{
          step: "needs",
          availability: AVAILABILITY_WINDOWS.filter((w) => needs.availability.includes(w.id)).map((w) => w.label),
          language: LANGUAGES.find((l) => l.id === needs.language)?.label,
          gender: CLINICIAN_GENDERS.find((g) => g.id === needs.gender)?.label,
          note: needs.note,
        }}
      />
      <Progress step="match" />
      <p className="self-start rounded-md border border-dashed border-ink-muted px-3 py-1 text-sm text-ink-muted">
        Temporary stub · the real match arrives in the next slice
      </p>
      <h1 className="text-xl font-semibold">Your matches are on their way</h1>
      <p className="text-ink-muted">
        For now, choose a sample clinician to see the cost and terms step. No real clinician or time is booked.
      </p>
      <div className="flex flex-col items-start gap-4">
        <PrimaryButton type="button" onClick={chooseSample}>
          Choose a sample clinician
        </PrimaryButton>
        <TextLink href="/needs">Back</TextLink>
      </div>
    </Screen>
  );
}
