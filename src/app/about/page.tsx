"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { getTracker } from "@/analytics/client";
import { DobQuestion, ExclusionNote, RadioQuestion, maskedFromFields, splitMaskedDob } from "@/components/form";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import {
  checkAge,
  checkCoverage,
  dobProblem,
  parseDob,
  type CheckResult,
  type CoverageAnswer,
  type Criterion,
  type DateOfBirth,
} from "@/eligibility";
import { eligibility } from "@/facts";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const DOB_MESSAGES = {
  incomplete: "Please enter your date of birth as MM/DD/YYYY.",
  not_a_date: "That date doesn't look right. Use MM/DD/YYYY, like 04/15/1990.",
  in_future: "That date is in the future. Please check the year.",
  too_long_ago: "That year looks too long ago. Please check it.",
} as const;

/** Records an eligibility result the moment an answer arrives, once per criterion and result. */
function recordCheck(criterion: Criterion, result: CheckResult) {
  trackOnce(`eligibility.checked:${criterion}:${result}`, "eligibility.checked", { criterion, result, on_step: "about" });
}

/** A valid date of birth, or the reason it isn't one, from the masked MM/DD/YYYY string. */
function readDob(masked: string, today: Date): DateOfBirth | keyof typeof DOB_MESSAGES {
  const dob = parseDob(splitMaskedDob(masked));
  if (typeof dob === "string") return dob;
  return dobProblem(dob, today) ?? dob;
}

export default function AboutPage() {
  const answers = useAnswers();
  useTrackOnce("about.viewed", "about.viewed");
  if (!answers) return <LoadingScreen />;
  return <AboutForm initial={answers} />;
}

function AboutForm({ initial }: { initial: SessionAnswers }) {
  const router = useRouter();
  const today = useRef(new Date()).current;
  const [dob, setDob] = useState<string>(initial.dob ? maskedFromFields(initial.dob) : "");
  const [coverage, setCoverage] = useState<CoverageAnswer | undefined>(initial.coverage);
  const [dobTouched, setDobTouched] = useState(Boolean(initial.dob));
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const dobResult = readDob(dob, today);
  const dobValid = typeof dobResult !== "string";
  const ageResult = dobValid ? checkAge(dobResult, today) : undefined;

  function changeDob(value: string) {
    setDob(value);
    const result = readDob(value, today);
    if (typeof result !== "string") recordCheck("age", checkAge(result, today));
  }

  function chooseCoverage(value: CoverageAnswer) {
    setCoverage(value);
    recordCheck("coverage", checkCoverage(value));
  }

  const errors = {
    dob: dobValid ? undefined : DOB_MESSAGES[dobResult as keyof typeof DOB_MESSAGES],
    coverage: coverage ? undefined : "Please choose an answer. Not sure is fine.",
  };
  const shown = {
    dob: submitted || (dobTouched && dobResult !== "incomplete") ? errors.dob : undefined,
    coverage: submitted ? errors.coverage : undefined,
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errors.dob || errors.coverage) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    // Location was already decided from the ZIP on Start, so it is not asked again.
    const exclusions: Criterion[] = [];
    if (ageResult === "fail") exclusions.push("age");
    if (checkCoverage(coverage!) === "fail") exclusions.push("coverage");

    updateAnswers({
      dob: splitMaskedDob(dob),
      coverage,
      confirmCoverageAtInsurance: coverage === "unsure",
      exclusions,
    });
    getTracker()("about.submitted");
    router.push(exclusions.length ? "/next-steps" : "/conditions");
  }

  const errorList = (Object.entries(shown) as [keyof typeof shown, string | undefined][]).filter(([, e]) => e);

  return (
    <Screen>
      <Progress step="about" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">A little about you</h1>
        <p className="text-ink-muted">Two quick questions to make sure we can care for you.</p>
      </div>

      {errorList.length > 0 && submitted && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md bg-caution-tint p-4">
          <p className="font-semibold">A couple of answers still need a look</p>
          <ul className="flex flex-col gap-1">
            {errorList.map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`} className="text-caution underline underline-offset-2">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={submit} className="flex flex-col gap-8">
        <DobQuestion
          value={dob}
          onChange={changeDob}
          onBlur={() => setDobTouched(true)}
          error={shown.dob}
          note={
            ageResult === "fail" && (
              <ExclusionNote>
                Legion sees adults {eligibility.minimumAge.value} and older. When you continue, we&apos;ll show you
                other ways to find care.
              </ExclusionNote>
            )
          }
        />

        <RadioQuestion
          id="coverage"
          legend="Do you have Medicare or Medicaid?"
          reason="Legion can't accept Medicare or Medicaid right now, so we check before going further."
          help="Not sure? Your insurance card or your insurer can tell you. You can also choose Not sure and we'll confirm it at the insurance step."
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
            { value: "unsure", label: "Not sure" },
          ]}
          value={coverage}
          onChange={chooseCoverage}
          error={shown.coverage}
          note={
            coverage === "yes" && (
              <ExclusionNote>
                Legion can&apos;t accept Medicare or Medicaid right now. When you continue, we&apos;ll show you what
                you can do instead.
              </ExclusionNote>
            )
          }
        />

        <ActionBar backHref="/start">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
        </ActionBar>
      </form>
    </Screen>
  );
}
