"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import { useTrackOnce } from "@/analytics/hooks";
import { CLINICIAN_GENDERS, LANGUAGES, type ClinicianGender, type LanguageId } from "@/clinicians/model";
import { RadioQuestion } from "@/components/form";
import { CrisisPanel, SafeFreeText } from "@/components/safety";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import { localSafetyCheck } from "@/safety/local";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const NO_PREFERENCE = "any";

export default function NeedsPage() {
  const answers = useAnswers();
  useTrackOnce("needs.viewed", "needs.viewed");
  if (!answers) return <LoadingScreen />;
  return <NeedsForm initial={answers.needs} />;
}

function NeedsForm({ initial }: { initial: SessionAnswers["needs"] }) {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageId | typeof NO_PREFERENCE>(initial?.language ?? NO_PREFERENCE);
  const [gender, setGender] = useState<ClinicianGender | typeof NO_PREFERENCE>(initial?.gender ?? NO_PREFERENCE);
  const [note, setNote] = useState(initial?.note ?? "");
  const [panelShown, setPanelShown] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = note.trim();
    if (text && localSafetyCheck(text).concern && !panelShown) {
      setPanelShown(true);
      requestAnimationFrame(() => panelRef.current?.focus());
      return;
    }
    updateAnswers({
      needs: {
        // Time of day moved to a filter on the Match step; no availability asked here.
        availability: [],
        language: language === NO_PREFERENCE ? undefined : language,
        gender: gender === NO_PREFERENCE ? undefined : gender,
        note: text || undefined,
      },
    });
    getTracker()("needs.submitted", {
      answered_language: language !== NO_PREFERENCE,
      answered_gender: gender !== NO_PREFERENCE,
      free_text_used: Boolean(text),
    });
    router.push("/match");
  }

  return (
    <Screen>
      <Progress step="needs" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">What would make a clinician right for you?</h1>
        <p className="text-ink-muted">We use these to suggest clinicians. Everything here is optional.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-8">
        <RadioQuestion
          id="language"
          legend="Language for your visits"
          reason="We'll show clinicians who speak it."
          options={[{ value: NO_PREFERENCE, label: "No preference" }, ...LANGUAGES.map((l) => ({ value: l.id, label: l.label }))]}
          value={language}
          onChange={setLanguage}
        />

        <RadioQuestion
          id="gender"
          legend="Would you prefer a clinician of a certain gender?"
          reason="Some people feel more at ease with one. It's fine not to mind."
          options={[
            { value: NO_PREFERENCE, label: "No preference" },
            ...CLINICIAN_GENDERS.map((g) => ({ value: g.id, label: g.label })),
          ]}
          value={gender}
          onChange={setGender}
        />

        <SafeFreeText
          id="needs-note"
          label="Anything else you want your clinician to know? (optional)"
          hint="For example, something that would help you feel comfortable. Read by your care team. We also check it for safety concerns and use it to draft your visit summary."
          value={note}
          onChange={setNote}
          step="needs"
          onEscalate={(escalated) => escalated && setPanelShown(true)}
        />
        {panelShown && !note.trim() && <CrisisPanel ref={panelRef} />}

        <ActionBar backHref="/insurance">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
        </ActionBar>
      </form>
    </Screen>
  );
}
