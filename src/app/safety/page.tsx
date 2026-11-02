"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTracker } from "@/analytics/client";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { RadioQuestion } from "@/components/form";
import { ReflectBack } from "@/components/ReflectBack";
import { CrisisPanel } from "@/components/safety";
import { LoadingScreen, PrimaryButton, Progress, Screen, TextLink } from "@/components/ui";
import { conditionTopics } from "@/facts";
import { AFTER_SAFETY } from "@/journey";
import { updateAnswers, useAnswers, type SafetyAnswer, type SessionAnswers } from "@/session/store";

const OPTIONS: { value: SafetyAnswer; label: string }[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "rather_not_say", label: "I'd rather not say" },
];

export default function SafetyPage() {
  const answers = useAnswers();
  useTrackOnce("safety.viewed", "safety.viewed");
  if (!answers) return <LoadingScreen />;
  return <SafetyForm answers={answers} />;
}

function SafetyForm({ answers }: { answers: SessionAnswers }) {
  const router = useRouter();
  const [recentThoughts, setRecentThoughts] = useState(answers.safety?.recentThoughts);
  const [hospitalized, setHospitalized] = useState(answers.safety?.hospitalized);
  const conditions = answers.conditions ?? { topics: [], unsure: false, skipped: true };
  const labels = conditionTopics.value.filter((t) => conditions.topics.includes(t.id)).map((t) => t.label);

  // Any answer other than "no" on a safety question expands the crisis panel under it
  // and records an escalation. The answer itself is never sent, only that help was shown.
  function escalate(question: string) {
    trackOnce(`safety.escalated:${question}:answer`, "safety.escalated", { source: "answer", on_step: "safety" });
  }

  function chooseRecent(value: SafetyAnswer) {
    setRecentThoughts(value);
    if (value !== "no") escalate("recent");
  }

  function chooseHospitalized(value: SafetyAnswer) {
    setHospitalized(value);
    if (value === "yes") escalate("hospitalized");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // Recorded only. These answers never decide eligibility in the prototype.
    updateAnswers({ safety: { recentThoughts, hospitalized } });
    getTracker()("safety.submitted");
    router.push(AFTER_SAFETY);
  }

  return (
    <Screen>
      <ReflectBack
        input={{
          step: "conditions",
          topics: labels,
          unsure: conditions.unsure,
          skipped: conditions.skipped,
          freeText: conditions.freeText,
        }}
      />
      <Progress step="safety" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Two questions about your safety</h1>
        <p className="text-ink-muted">
          We ask everyone these. Your answers help your clinician prepare, and you can keep going whatever you answer.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-8">
        <RadioQuestion
          id="recent-thoughts"
          legend="In the past month, have you had thoughts of ending your life or hurting yourself?"
          reason="It's okay to answer honestly. Many people have had thoughts like these."
          options={OPTIONS}
          value={recentThoughts}
          onChange={chooseRecent}
          note={recentThoughts && recentThoughts !== "no" && <CrisisPanel variant={recentThoughts === "yes" ? "concern" : "gentle"} />}
        />

        <RadioQuestion
          id="hospitalized"
          legend="Have you ever stayed in a hospital overnight or longer for your mental health?"
          reason="This helps your clinician understand what care has looked like for you before."
          options={OPTIONS}
          value={hospitalized}
          onChange={chooseHospitalized}
          note={hospitalized === "yes" && <CrisisPanel variant="gentle" />}
        />

        <div className="flex flex-col items-start gap-4">
          <PrimaryButton type="submit">Continue</PrimaryButton>
          <TextLink href="/conditions">Back</TextLink>
        </div>
      </form>
    </Screen>
  );
}
