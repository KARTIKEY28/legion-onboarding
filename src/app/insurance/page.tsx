"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { ExclusionNote, RadioQuestion } from "@/components/form";
import { CheckOption } from "@/components/safety";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import { resultFromInsurance } from "@/data/estimate";
import { samplePayers } from "@/facts";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

type Path = NonNullable<SessionAnswers["insurance"]>["path"];
type CoverageAnswer = NonNullable<SessionAnswers["coverageAtInsurance"]>;
const OTHER = "other";

const inputClass = (error?: string) =>
  `min-h-12 rounded-md border bg-surface px-3 text-base ${error ? "border-danger" : "border-line"}`;

/** The calm ~2 second "checking your coverage" state after an insured submit. */
function CheckingCoverage() {
  return (
    <Screen>
      <Progress step="insurance" />
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-lg bg-surface p-8 text-center">
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Checking your coverage</h1>
          <p className="text-ink-muted">This takes a moment. We&apos;re estimating your cost before you book.</p>
        </div>
      </div>
    </Screen>
  );
}

export default function InsurancePage() {
  const answers = useAnswers();
  useTrackOnce("insurance.viewed", "insurance.viewed");
  if (!answers) return <LoadingScreen />;
  return <InsuranceForm answers={answers} />;
}

function InsuranceForm({ answers }: { answers: SessionAnswers }) {
  const router = useRouter();
  const saved = answers.insurance;
  const askCoverage = Boolean(answers.confirmCoverageAtInsurance);
  const [coverage, setCoverage] = useState<CoverageAnswer | undefined>(answers.coverageAtInsurance);
  const [path, setPath] = useState<Path | undefined>(saved?.path);
  const [payerId, setPayerId] = useState(saved?.payerId ?? "");
  const [payerOther, setPayerOther] = useState(saved?.payerOther ?? "");
  const [memberId, setMemberId] = useState(saved?.memberId ?? "");
  const [groupId, setGroupId] = useState(saved?.groupId ?? "");
  const [addLater, setAddLater] = useState(saved?.addLater ?? false);
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  function chooseCoverage(value: CoverageAnswer) {
    setCoverage(value);
    const result = value === "yes" ? "fail" : value === "no" ? "pass" : "unconfirmed";
    trackOnce(`eligibility.checked:coverage:${result}:insurance`, "eligibility.checked", {
      criterion: "coverage",
      result,
      on_step: "insurance",
    });
  }

  const excluded = coverage === "yes";
  const needsDetails = !excluded && path === "insured" && !addLater;
  const errors = {
    coverage: askCoverage && !coverage ? "Please choose an answer. Still not sure is fine." : undefined,
    path: path || excluded ? undefined : "Please choose how you'd like to pay. “I'm not sure yet” is fine.",
    payer:
      needsDetails && !payerId
        ? "Please choose your plan, or pick “Other”."
        : needsDetails && payerId === OTHER && !payerOther.trim()
          ? "Please type your plan or insurer's name."
          : undefined,
    member: needsDetails && memberId.trim().length < 3 ? "Please add your member ID. It's on the front of your card." : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};
  const errorList = (Object.entries(shown) as [string, string | undefined][]).filter(([, e]) => e);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (coverage === "yes") {
      updateAnswers({ coverageAtInsurance: coverage, exclusions: ["coverage"] });
      router.push("/next-steps");
      return;
    }
    const insurance: SessionAnswers["insurance"] =
      path === "insured"
        ? {
            path,
            addLater,
            payerId: addLater ? undefined : payerId,
            payerOther: addLater || payerId !== OTHER ? undefined : payerOther.trim(),
            memberId: addLater ? undefined : memberId.trim(),
            groupId: addLater ? undefined : groupId.trim() || undefined,
          }
        : { path: path! };
    updateAnswers({
      coverageAtInsurance: coverage,
      // Still not sure: keep the reminder so coverage is confirmed at verification.
      confirmCoverageAtInsurance: askCoverage ? coverage !== "no" : answers.confirmCoverageAtInsurance,
      insurance,
    });
    getTracker()("insurance.submitted", { path: path! });

    if (path === "insured") {
      // Run the simulated eligibility check (results come only from plans.ts).
      const estimate = resultFromInsurance({ insurance });
      setChecking(true);
      window.setTimeout(() => {
        updateAnswers({ eligibilityCost: estimate });
        if (estimate.result !== "self_pay") {
          getTracker()("eligibility.checked_cost", { result: estimate.result });
        }
        router.push("/needs");
      }, 2000);
      return;
    }

    updateAnswers({ eligibilityCost: { result: "self_pay" } });
    router.push("/needs");
  }

  if (checking) return <CheckingCoverage />;

  return (
    <Screen>
      <Progress step="insurance" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">How would you like to pay?</h1>
        <p className="text-ink-muted">Either way, you&apos;ll see the full cost before you create an account or add a card.</p>
      </div>

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md bg-danger-soft p-4">
          <p className="font-semibold">A couple of answers still need a look</p>
          <ul className="flex flex-col gap-1">
            {errorList.map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`} className="text-danger underline underline-offset-2">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={submit} className="flex flex-col gap-8">
        {askCoverage && (
          <RadioQuestion
            id="coverage"
            legend="Is your plan Medicare, Medicaid, or a plan through either one?"
            reason="Earlier you weren't sure, which is completely fine. Legion can't accept Medicare or Medicaid right now, so we check once more."
            help="Plans through either one are sometimes called Medicare Advantage or a Medicaid health plan. Your card or your insurer can tell you."
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "unsure", label: "I'm still not sure" },
            ]}
            value={coverage}
            onChange={chooseCoverage}
            error={shown.coverage}
            note={
              coverage === "yes" ? (
                <ExclusionNote>
                  Thanks for checking. Legion can&apos;t accept Medicare or Medicaid right now. When you continue,
                  we&apos;ll show you what you can do instead.
                </ExclusionNote>
              ) : coverage === "unsure" ? (
                <p className="text-ink-muted">That&apos;s okay. We&apos;ll confirm it when we verify your coverage after you book.</p>
              ) : null
            }
          />
        )}

        {coverage !== "yes" && (
          <RadioQuestion
            id="path"
            legend="How you'd like to pay"
            hideLegend
            options={[
              { value: "insured", label: "I have insurance" },
              { value: "self_pay", label: "I'll pay without insurance" },
              { value: "not_sure", label: "I'm not sure yet" },
            ]}
            value={path}
            onChange={setPath}
            error={shown.path}
          />
        )}

        {coverage !== "yes" && path === "insured" && (
          <section aria-labelledby="plan-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="plan-heading" className="text-lg font-semibold">
                Your insurance details
              </h2>
              <p className="text-ink-muted">
                We only ask what&apos;s needed to check your coverage. We don&apos;t check it here: your coverage is confirmed
                after you book.
              </p>
            </div>

            <CheckOption label="I'll add my insurance details later" checked={addLater} onChange={setAddLater} />

            {!addLater && (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="payer" className="font-medium">
                    Plan or insurer
                  </label>
                  <p id="payer-hint" className="text-sm text-ink-muted">
                    Sample plan names for this prototype.
                  </p>
                  {shown.payer && (
                    <p id="payer-error" className="text-danger">
                      {shown.payer}
                    </p>
                  )}
                  <select
                    id="payer"
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    aria-describedby={`payer-hint${shown.payer ? " payer-error" : ""}`}
                    aria-invalid={Boolean(shown.payer)}
                    className={inputClass(shown.payer)}
                  >
                    <option value="">Choose your plan</option>
                    {samplePayers.value.map((payer) => (
                      <option key={payer.id} value={payer.id}>
                        {payer.label}
                      </option>
                    ))}
                    <option value={OTHER}>Other</option>
                  </select>
                </div>

                {payerId === OTHER && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="payer-other" className="font-medium">
                      Plan or insurer name
                    </label>
                    <input
                      id="payer-other"
                      value={payerOther}
                      maxLength={80}
                      onChange={(e) => setPayerOther(e.target.value)}
                      className={inputClass(shown.payer)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label htmlFor="member" className="font-medium">
                    Member ID
                  </label>
                  <p id="member-hint" className="text-sm text-ink-muted">
                    Usually on the front of your insurance card.
                  </p>
                  {shown.member && (
                    <p id="member-error" className="text-danger">
                      {shown.member}
                    </p>
                  )}
                  <input
                    id="member"
                    value={memberId}
                    maxLength={40}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setMemberId(e.target.value)}
                    aria-describedby={`member-hint${shown.member ? " member-error" : ""}`}
                    aria-invalid={Boolean(shown.member)}
                    className={inputClass(shown.member)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="group" className="font-medium">
                    Group ID (optional)
                  </label>
                  <p id="group-hint" className="text-sm text-ink-muted">
                    Some cards have one. Leave it blank if yours doesn&apos;t.
                  </p>
                  <input
                    id="group"
                    value={groupId}
                    maxLength={40}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setGroupId(e.target.value)}
                    aria-describedby="group-hint"
                    className={inputClass()}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {coverage !== "yes" && path === "not_sure" && (
          <p className="text-ink-muted">
            No problem. We&apos;ll show you the cost without insurance, and you can add your insurance later.
          </p>
        )}

        <ActionBar backHref="/safety">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
        </ActionBar>
      </form>
    </Screen>
  );
}
