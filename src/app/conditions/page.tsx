"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import { useTrackOnce } from "@/analytics/hooks";
import { Chip } from "@/components/form";
import { CheckOption, CrisisPanel, SafeFreeText } from "@/components/safety";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import { conditionTopics, type TopicId } from "@/facts";
import { localSafetyCheck } from "@/safety/local";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

export default function ConditionsPage() {
  const answers = useAnswers();
  useTrackOnce("conditions.viewed", "conditions.viewed");
  if (!answers) return <LoadingScreen />;
  return <ConditionsForm initial={answers.conditions} />;
}

function ConditionsForm({ initial }: { initial: SessionAnswers["conditions"] }) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicId[]>(initial?.topics ?? []);
  const [unsure, setUnsure] = useState(initial?.unsure ?? false);
  const [ownWords, setOwnWords] = useState(Boolean(initial?.freeText));
  const [freeText, setFreeText] = useState(initial?.freeText ?? "");
  const [error, setError] = useState<string>();
  const [panelShown, setPanelShown] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  function toggleTopic(id: TopicId, checked: boolean) {
    setError(undefined);
    setUnsure(false);
    setTopics((current) => (checked ? [...current, id] : current.filter((t) => t !== id)));
  }

  function toggleUnsure(checked: boolean) {
    setError(undefined);
    setUnsure(checked);
    if (checked) setTopics([]);
  }

  function finish(skipped: boolean) {
    const text = ownWords ? freeText.trim() : "";
    const conditions = skipped
      ? { topics: [], unsure: false, skipped: true }
      : { topics, unsure, skipped: false, freeText: text || undefined };
    updateAnswers({ conditions });
    getTracker()("conditions.submitted", {
      selected_count: conditions.topics.length,
      free_text_used: Boolean(!skipped && text),
      unsure: conditions.unsure,
      skipped,
    });
    router.push("/safety");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = ownWords ? freeText.trim() : "";
    if (!topics.length && !unsure && !text) {
      setError("Choose anything that fits, pick “I’m not sure”, or skip this for now.");
      return;
    }
    // If crisis language appears at the last moment, show help once before moving on. Continue still works.
    if (text && localSafetyCheck(text).concern && !panelShown) {
      setPanelShown(true);
      requestAnimationFrame(() => panelRef.current?.focus());
      return;
    }
    finish(false);
  }

  return (
    <Screen>
      <Progress step="conditions" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">What&apos;s been on your mind?</h1>
        <p className="text-ink-muted">
          Choose anything that fits, as many as you like. This helps us suggest clinicians who know these areas well.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3" aria-describedby={error ? "conditions-error" : undefined}>
          <legend className="sr-only">Topics</legend>
          {error && (
            <p id="conditions-error" role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-2">
            {conditionTopics.value.map((topic) => (
              <Chip
                key={topic.id}
                label={topic.label}
                selected={topics.includes(topic.id)}
                onToggle={() => toggleTopic(topic.id, !topics.includes(topic.id))}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <CheckOption label="Something else, in my own words" checked={ownWords} onChange={setOwnWords} />
            <CheckOption label="I'm not sure" checked={unsure} onChange={toggleUnsure} />
          </div>
        </fieldset>

        {ownWords && (
          <SafeFreeText
            id="conditions-text"
            label="In your own words (optional)"
            hint="Share as much or as little as you like. Only your care team would read this."
            value={freeText}
            onChange={setFreeText}
            step="conditions"
            onEscalate={(escalated) => escalated && setPanelShown(true)}
          />
        )}
        {panelShown && !ownWords && <CrisisPanel ref={panelRef} />}

        <ActionBar backHref="/about">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
          <button
            type="button"
            onClick={() => finish(true)}
            className="self-center text-accent underline underline-offset-2 md:self-auto"
          >
            Skip for now
          </button>
        </ActionBar>
      </form>
    </Screen>
  );
}
