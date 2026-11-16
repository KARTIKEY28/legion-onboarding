"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { ExclusionNote, RadioQuestion } from "@/components/form";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary, secondaryClass } from "@/components/ui";
import { estimateLine } from "@/data/estimate";
import { planLabel, programForPlan, resultForPlan, type EligibilityResult } from "@/data/plans";
import { discoverCoverage, type DiscoveredPlan, type DiscoveryResult } from "@/data/discovery";
import { payersForState } from "@/facts";
import { getAnswers, updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

type Path = NonNullable<SessionAnswers["insurance"]>["path"];
type CoverageAnswer = NonNullable<SessionAnswers["coverageAtInsurance"]>;
const OTHER = "other";

/** The rungs of the insured ladder (B): consent, then a discovery branch or the manual form. */
type Rung = "consent" | "collect_name" | "looking_up" | "confirm_one" | "confirm_multi" | "manual" | "result";

const inputClass = (error?: string) =>
  `min-h-12 w-full rounded-md border bg-surface px-3 text-base ${error ? "border-caution" : "border-line"}`;

/** Shows only the last four of a member/group id, so it's recognisable without exposing it. */
function maskId(id: string): string {
  const tail = id.slice(-4);
  return `•••• ${tail}`;
}

function dobLabel(dob: SessionAnswers["dob"]): string | null {
  if (!dob) return null;
  return `${dob.month}/${dob.day}/${dob.year}`;
}

/** The calm checking state, reused for the eligibility check and the discovery lookup. */
function Spinner({ title, note }: { title: string; note: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-lg bg-surface p-8 text-center">
      <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-ink-muted">{note}</p>
      </div>
    </div>
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
  const state = answers.state ?? "TX";
  const dob = dobLabel(answers.dob);

  const [coverage, setCoverage] = useState<CoverageAnswer | undefined>(answers.coverageAtInsurance);
  const [path, setPath] = useState<Path | undefined>(saved?.path);
  const [checking, setChecking] = useState(false);

  // Insured ladder state.
  const [rung, setRung] = useState<Rung>("consent");
  const [first, setFirst] = useState(answers.patient?.firstName ?? "");
  const [last, setLast] = useState(answers.patient?.lastName ?? "");
  const [nameError, setNameError] = useState<string>();
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [chosen, setChosen] = useState<DiscoveredPlan | null>(null);
  const [costResult, setCostResult] = useState<{ result: EligibilityResult; payerId?: string } | null>(null);

  // Manual form fields (the fallback rung).
  const [payerId, setPayerId] = useState(saved?.payerId ?? "");
  const [payerOther, setPayerOther] = useState(saved?.payerOther ?? "");
  const [memberId, setMemberId] = useState(saved?.memberId ?? "");
  const [groupId, setGroupId] = useState(saved?.groupId ?? "");
  const [manualSubmitted, setManualSubmitted] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const excluded = coverage === "yes";

  function chooseCoverage(value: CoverageAnswer) {
    setCoverage(value);
    const result = value === "yes" ? "fail" : value === "no" ? "pass" : "unconfirmed";
    trackOnce(`eligibility.checked:coverage:${result}:insurance`, "eligibility.checked", {
      criterion: "coverage",
      result,
      on_step: "insurance",
    });
  }

  function choosePath(value: Path) {
    setPath(value);
    if (value === "insured") {
      setRung("consent");
      trackOnce("insurance.discovery_offered", "insurance.discovery_offered");
    }
  }

  // ---- The shared "a plan is confirmed" step: run eligibility, branch, show the result. ----
  function confirmPlan(plan: DiscoveredPlan, source: "discovery" | "manual") {
    const program = programForPlan(plan.payerId);
    const saidNo = answers.coverage === "no" || coverage === "no";
    getTracker()("insurance.plan_confirmed", { source });

    const insurance: NonNullable<SessionAnswers["insurance"]> = {
      path: "insured",
      payerId: plan.payerId === OTHER ? undefined : plan.payerId,
      payerOther: plan.payerId === OTHER ? payerOther.trim() : undefined,
      memberId: plan.memberId || undefined,
      groupId: plan.groupId || undefined,
    };

    setChecking(true);
    window.setTimeout(() => {
      if (program) {
        // A government plan Legion can't accept: warm exclusion + waitlist.
        updateAnswers({
          coverageAtInsurance: coverage,
          insurance,
          exclusions: ["coverage"],
          lateDiscovery: { planLabel: planLabel(plan.payerId), program, contradicted: saidNo },
        });
        getTracker()("insurance.cost_result", { result: "not_covered" });
        router.push("/next-steps");
        return;
      }
      const result = resultForPlan(plan.payerId === OTHER ? undefined : plan.payerId);
      const estimate = { result, payerId: plan.payerId === OTHER ? undefined : plan.payerId };
      updateAnswers({
        coverageAtInsurance: coverage,
        confirmCoverageAtInsurance: askCoverage ? coverage !== "no" : answers.confirmCoverageAtInsurance,
        insurance,
        eligibilityCost: estimate,
        patient: { ...getAnswers().patient, firstName: first.trim() || undefined, lastName: last.trim() || undefined },
      });
      getTracker()("insurance.cost_result", { result });
      setCostResult(estimate);
      setChecking(false);
      setRung("result");
    }, 1500);
  }

  // ---- Discovery ("Find my coverage"). ----
  function startDiscovery() {
    if (!answers.patient?.firstName && !first.trim()) {
      setRung("collect_name");
      return;
    }
    runDiscovery();
  }

  function submitName(event: React.FormEvent) {
    event.preventDefault();
    if (!first.trim() || !last.trim()) {
      setNameError("Please add your first and last name so we can look you up.");
      return;
    }
    setNameError(undefined);
    runDiscovery();
  }

  function runDiscovery() {
    getTracker()("insurance.discovery_consented");
    setRung("looking_up");
    window.setTimeout(() => {
      const result = discoverCoverage(first || answers.patient?.firstName || "", last || answers.patient?.lastName || "", answers.dob);
      setDiscovery(result);
      const resultName =
        result.kind === "one" ? "one_match" : result.kind === "multi" ? "multi_match" : result.kind === "none" ? "no_match" : "failed";
      getTracker()("insurance.discovery_result", { result: resultName });
      if (result.kind === "one") {
        setChosen(result.plan);
        setRung("confirm_one");
      } else if (result.kind === "multi") {
        setRung("confirm_multi");
      } else {
        // No match or a failed lookup: fall through to the manual form (first-class).
        goManual();
      }
    }, 1500);
  }

  function goManual() {
    getTracker()("insurance.rung_reached", { rung: 3 });
    setRung("manual");
  }

  function goPicker() {
    // "No" / "None of these": the payer picker is the manual form.
    getTracker()("insurance.plan_rejected");
    getTracker()("insurance.rung_reached", { rung: 2 });
    setRung("manual");
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    setManualSubmitted(true);
    const needPlan = !payerId;
    const needOther = payerId === OTHER && !payerOther.trim();
    const needMember = payerId !== OTHER && payerId !== "" && memberId.trim().length < 3;
    if (needPlan || needOther || needMember) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    confirmPlan({ payerId, memberId: memberId.trim(), groupId: groupId.trim() || undefined }, "manual");
  }

  function submitPathOnly(event: React.FormEvent) {
    event.preventDefault();
    if (coverage === "yes") {
      updateAnswers({ coverageAtInsurance: coverage, exclusions: ["coverage"] });
      router.push("/next-steps");
      return;
    }
    if (!path) return;
    if (path === "self_pay" || path === "not_sure") {
      updateAnswers({
        coverageAtInsurance: coverage,
        confirmCoverageAtInsurance: askCoverage ? coverage !== "no" : answers.confirmCoverageAtInsurance,
        insurance: { path },
        eligibilityCost: { result: "self_pay" },
      });
      getTracker()("insurance.submitted", { path });
      getTracker()("insurance.cost_result", { result: "self_pay" });
      router.push("/needs");
    }
  }

  if (checking) {
    return (
      <Screen>
        <Progress step="insurance" />
        <Spinner title="Checking your coverage" note="This takes a moment. We're estimating your cost before you book." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Progress step="insurance" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">How would you like to pay?</h1>
        <p className="text-ink-muted">Either way, you&apos;ll see the full cost before you create an account or add a card.</p>
      </div>

      {/* The Medicare/Medicaid re-ask (only when "not sure" earlier) and the path choice. */}
      <form noValidate onSubmit={submitPathOnly} className="flex flex-col gap-8">
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
            note={
              coverage === "yes" ? (
                <ExclusionNote>
                  Thanks for checking. Legion can&apos;t accept Medicare or Medicaid right now. When you continue, we&apos;ll
                  show you what you can do instead.
                </ExclusionNote>
              ) : coverage === "unsure" ? (
                <p className="text-ink-muted">That&apos;s okay. We&apos;ll confirm it when we verify your coverage after you book.</p>
              ) : null
            }
          />
        )}

        {!excluded && (
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
            onChange={choosePath}
          />
        )}

        {!excluded && path === "not_sure" && (
          <p className="text-ink-muted">
            No problem. We&apos;ll show you the cost without insurance, and you can add your insurance later.
          </p>
        )}

        {/* self-pay / not-sure continue with the path form; insured uses the ladder below. */}
        {!excluded && (path === "self_pay" || path === "not_sure") && (
          <ActionBar backHref="/safety">
            <PrimaryButton type="submit" className={barPrimary}>
              Continue
            </PrimaryButton>
          </ActionBar>
        )}
        {excluded && (
          <ActionBar backHref="/safety">
            <PrimaryButton type="submit" className={barPrimary}>
              Continue
            </PrimaryButton>
          </ActionBar>
        )}
      </form>

      {/* The insured ladder. */}
      {!excluded && path === "insured" && rung === "consent" && <Consent onFind={startDiscovery} onManual={goManual} />}

      {!excluded && path === "insured" && rung === "collect_name" && (
        <section aria-label="Your name" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">What&apos;s your name?</h2>
            <p className="text-ink-muted">We use your name and date of birth to find your coverage.</p>
          </div>
          <form noValidate onSubmit={submitName} className="flex flex-col gap-4">
            {nameError && (
              <p role="alert" className="text-caution">
                {nameError}
              </p>
            )}
            <Field id="dsc-first" label="First name" value={first} onChange={setFirst} autoComplete="given-name" />
            <Field id="dsc-last" label="Last name" value={last} onChange={setLast} autoComplete="family-name" />
            {dob && (
              <div className="flex flex-col gap-1">
                <span className="font-medium">Date of birth</span>
                <p className="min-h-12 rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink-muted">{dob}</p>
                <p className="text-sm text-ink-muted">From your earlier answer. Change it on the About you step.</p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-end sm:gap-3">
              <PrimaryButton type="submit" className={barPrimary}>
                Find my coverage
              </PrimaryButton>
              <button type="button" onClick={goManual} className={secondaryClass}>
                I&apos;ll type it in instead
              </button>
            </div>
          </form>
        </section>
      )}

      {!excluded && path === "insured" && rung === "looking_up" && (
        <Spinner title="Looking up your coverage" note="Checking your plan with your name and date of birth. This takes a moment." />
      )}

      {!excluded && path === "insured" && rung === "confirm_one" && chosen && (
        <section aria-label="Confirm your plan" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Is this your plan?</h2>
            <p className="text-ink-muted">We found one plan under your name.</p>
          </div>
          <PlanCard plan={chosen} />
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-end sm:gap-3">
            <PrimaryButton type="button" className={barPrimary} onClick={() => confirmPlan(chosen, "discovery")}>
              Yes, that&apos;s my plan
            </PrimaryButton>
            <button type="button" onClick={goPicker} className={secondaryClass}>
              No, that&apos;s not it
            </button>
          </div>
        </section>
      )}

      {!excluded && path === "insured" && rung === "confirm_multi" && discovery?.kind === "multi" && (
        <section aria-label="Which plan is yours" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Which of these is yours?</h2>
            <p className="text-ink-muted">We found a few plans under your name.</p>
          </div>
          <div className="flex flex-col gap-2">
            {discovery.plans.map((plan) => (
              <button
                key={plan.memberId}
                type="button"
                onClick={() => confirmPlan(plan, "discovery")}
                className="rounded-md border border-line bg-canvas p-3 text-left hover:border-accent"
              >
                <PlanCard plan={plan} />
              </button>
            ))}
          </div>
          <button type="button" onClick={goPicker} className="self-start text-accent underline underline-offset-2">
            None of these
          </button>
        </section>
      )}

      {!excluded && path === "insured" && rung === "manual" && (
        <ManualForm
          state={state}
          payerId={payerId}
          setPayerId={setPayerId}
          payerOther={payerOther}
          setPayerOther={setPayerOther}
          memberId={memberId}
          setMemberId={setMemberId}
          groupId={groupId}
          setGroupId={setGroupId}
          submitted={manualSubmitted}
          summaryRef={summaryRef}
          onSubmit={submitManual}
        />
      )}

      {!excluded && path === "insured" && rung === "result" && costResult && (
        <CostResult
          result={costResult.result}
          line={estimateLine(costResult)}
          onContinue={() => router.push("/needs")}
          onEdit={() => {
            setCostResult(null);
            setRung("manual");
          }}
        />
      )}
    </Screen>
  );
}

/** Rung 1: the discovery consent. Never auto-runs, never pre-checks. */
function Consent({ onFind, onManual }: { onFind: () => void; onManual: () => void }) {
  return (
    <section aria-label="Find your coverage" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Want us to find your coverage?</h2>
        <p className="text-ink-muted">
          We&apos;ll use your name and date of birth to look up your plan, so you don&apos;t have to type your member ID. You
          can type it in instead.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-end sm:gap-3">
        <PrimaryButton type="button" className={barPrimary} onClick={onFind}>
          Find my coverage
        </PrimaryButton>
        <button type="button" onClick={onManual} className={secondaryClass}>
          I&apos;ll type it in
        </button>
      </div>
    </section>
  );
}

/** A discovered plan, with the member/group ids masked to the last four. */
function PlanCard({ plan }: { plan: DiscoveredPlan }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base font-medium">{planLabel(plan.payerId)}</p>
      <p className="text-sm text-ink-muted">Member ID {maskId(plan.memberId)}</p>
      {plan.groupId && <p className="text-sm text-ink-muted">Group {maskId(plan.groupId)}</p>}
    </div>
  );
}

/** The cost result shown on Insurance once a plan is confirmed (C1). */
function CostResult({
  result,
  line,
  onContinue,
  onEdit,
}: {
  result: EligibilityResult;
  line: string;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const heading = result === "copay" ? "Here's your estimated cost" : result === "specialist" ? "Here's what your plan covers" : "About your cost";
  return (
    <section aria-label="Your estimated cost" className="flex flex-col gap-3 rounded-lg bg-accent-soft p-4">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="text-base">{line}</p>
      <p className="text-sm text-ink-muted">All Legion clinicians are in network, so this is the same whichever clinician you pick.</p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end sm:gap-3">
        <PrimaryButton type="button" className={barPrimary} onClick={onContinue}>
          Continue
        </PrimaryButton>
        <button type="button" onClick={onEdit} className={secondaryClass}>
          Change plan
        </button>
      </div>
    </section>
  );
}

/** Rung 3: the manual payer picker + member/group ids. First-class, not an error. */
function ManualForm({
  state,
  payerId,
  setPayerId,
  payerOther,
  setPayerOther,
  memberId,
  setMemberId,
  groupId,
  setGroupId,
  submitted,
  summaryRef,
  onSubmit,
}: {
  state: "TX" | "UT";
  payerId: string;
  setPayerId: (v: string) => void;
  payerOther: string;
  setPayerOther: (v: string) => void;
  memberId: string;
  setMemberId: (v: string) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  submitted: boolean;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const planError = submitted && !payerId ? "Please choose your plan, or pick “Other”." : undefined;
  const otherError = submitted && payerId === OTHER && !payerOther.trim() ? "Please type your plan or insurer's name." : undefined;
  const memberError =
    submitted && payerId !== OTHER && payerId !== "" && memberId.trim().length < 3
      ? "Please add your member ID. It's on the front of your card."
      : undefined;

  return (
    <section aria-labelledby="manual-heading" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 id="manual-heading" className="text-lg font-semibold">
          Enter your insurance
        </h2>
        <p className="text-ink-muted">We don&apos;t verify it here: your coverage is confirmed after you book.</p>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div ref={summaryRef} tabIndex={-1} className="flex flex-col gap-1">
          <label htmlFor="payer" className="font-medium">
            Plan or insurer
          </label>
          <p id="payer-hint" className="text-sm text-ink-muted">
            Sample plan names for this prototype.
          </p>
          {planError && <p className="text-caution">{planError}</p>}
          <select
            id="payer"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            aria-describedby="payer-hint"
            aria-invalid={Boolean(planError)}
            className={inputClass(planError)}
          >
            <option value="">Choose your plan</option>
            {payersForState(state).map((payer) => (
              <option key={payer.id} value={payer.id}>
                {payer.label}
              </option>
            ))}
            <option value={OTHER}>Other</option>
          </select>
        </div>

        {payerId === OTHER && (
          <Field id="payer-other" label="Plan or insurer name" value={payerOther} onChange={setPayerOther} error={otherError} />
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="member" className="font-medium">
            Member ID
          </label>
          <p id="member-hint" className="text-sm text-ink-muted">
            Usually on the front of your insurance card.
          </p>
          {memberError && <p className="text-caution">{memberError}</p>}
          <input
            id="member"
            value={memberId}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setMemberId(e.target.value)}
            aria-describedby={`member-hint${memberError ? " member-error" : ""}`}
            aria-invalid={Boolean(memberError)}
            className={inputClass(memberError)}
          />
        </div>

        <Field id="group" label="Group ID (optional)" value={groupId} onChange={setGroupId} hint="Some cards have one. Leave it blank if yours doesn't." />

        <ActionBar backHref="/safety">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
        </ActionBar>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caution">
          {error}
        </p>
      )}
      <input
        id={id}
        value={value}
        maxLength={80}
        autoComplete={autoComplete ?? "off"}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={inputClass(error)}
      />
    </div>
  );
}
