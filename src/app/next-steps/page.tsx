"use client";

import { useEffect, useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { LoadingScreen, PrimaryButton, PrimaryLink, Screen, TextLink } from "@/components/ui";
import type { Criterion } from "@/eligibility";
import { crisisResources, eligibility } from "@/facts";
import { updateAnswers, useAnswers } from "@/session/store";

const REASONS: Record<Criterion, { heading: string; why: string; guidance: string }> = {
  texas: {
    heading: `Legion sees patients in ${eligibility.servedStates.value.join(" and ")} right now`,
    why: `Clinicians can only see patients who are physically in ${eligibility.servedStates.value.join(" or ")} during a visit.`,
    guidance: `We're adding states. Leave your email below and we'll tell you when we reach yours. For care where you are now, your doctor or your insurer can suggest clinicians near you.`,
  },
  age: {
    heading: `Legion sees adults ${eligibility.minimumAge.value} and older`,
    why: "That's because Legion's care is set up for adults.",
    guidance: "A parent or guardian, a school counselor or your doctor can help you find care that's right for your age.",
  },
  coverage: {
    heading: "Legion can't accept Medicare or Medicaid right now",
    why: "So we can't book a visit through your plan.",
    guidance: "Your plan can tell you which clinicians it covers. The member services number is usually on your card.",
  },
};

const NEXT_STEPS = ["guidance", "crisis_resources", "notify_me"] as const;
const NO_EXCLUSIONS: Criterion[] = [];

export default function NextStepsPage() {
  const answers = useAnswers();
  const exclusions = answers?.exclusions ?? NO_EXCLUSIONS;

  useEffect(() => {
    for (const criterion of exclusions) {
      for (const next_step of NEXT_STEPS) {
        trackOnce(`exclusion.next_step_shown:${criterion}:${next_step}`, "exclusion.next_step_shown", {
          criterion,
          next_step,
        });
      }
    }
  }, [exclusions]);

  if (!answers) return <LoadingScreen />;

  if (exclusions.length === 0) {
    return (
      <Screen>
        <h1 className="text-xl font-semibold">There&apos;s nothing to show here yet</h1>
        <p className="text-ink-muted">This page shows options when Legion can&apos;t see you. Start from the beginning to continue.</p>
        <PrimaryLink href="/start" className="self-start">
          Go to the start
        </PrimaryLink>
      </Screen>
    );
  }

  return (
    <Screen>
      <h1 className="text-2xl font-semibold">Thanks for telling us. Here&apos;s what you can do next.</h1>

      {exclusions.map((criterion) =>
        criterion === "coverage" && answers.lateDiscovery ? (
          <LateDiscovery key={criterion} discovery={answers.lateDiscovery} />
        ) : (
          <section key={criterion} aria-labelledby={`reason-${criterion}`} className="flex flex-col gap-2">
            <h2 id={`reason-${criterion}`} className="text-lg font-semibold">
              {REASONS[criterion].heading}
            </h2>
            <p className="text-ink-muted">{REASONS[criterion].why}</p>
            <p>{REASONS[criterion].guidance}</p>
          </section>
        ),
      )}

      <section aria-labelledby="crisis" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
        <h2 id="crisis" className="text-lg font-semibold">
          If you need help right now
        </h2>
        <ul className="flex flex-col gap-1">
          {crisisResources.map((resource) => (
            <li key={resource.id}>
              <a href={resource.href} className="font-medium underline underline-offset-2">
                {resource.action}
              </a>{" "}
              <span className="text-ink-muted">· {resource.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <NotifyMe initialEmail={answers.notifyEmail} />

      <TextLink href="/about" className="self-start">
        Answered something by mistake? Change your answers
      </TextLink>
    </Screen>
  );
}

const PROGRAM_LABEL = { medicaid: "Medicaid", medicare: "Medicare" } as const;

/**
 * The late-exclusion screen: coverage discovery returned a government plan after
 * the patient had answered (often "No") about Medicare/Medicaid. It names the
 * plan, says what it is, acknowledges the late and (when it contradicts the
 * earlier answer) apologetic catch, and points to a real next step. The waitlist
 * is the NotifyMe form below.
 */
function LateDiscovery({ discovery }: { discovery: NonNullable<ReturnType<typeof useAnswers>>["lateDiscovery"] }) {
  if (!discovery) return null;
  const program = PROGRAM_LABEL[discovery.program];
  return (
    <section aria-labelledby="reason-coverage" className="flex flex-col gap-2">
      <h2 id="reason-coverage" className="text-lg font-semibold">
        {discovery.planLabel} looks like a {program} plan
      </h2>
      {discovery.contradicted && (
        <p className="text-ink-muted">
          Earlier you said you don&apos;t have Medicare or Medicaid, so we&apos;re sorry to raise this now, after you&apos;d
          started booking.
        </p>
      )}
      <p className="text-ink-muted">
        When we checked your coverage, {discovery.planLabel} came back, and that&apos;s a {program} plan. Legion can&apos;t
        accept Medicare or Medicaid right now, so we can&apos;t book this visit through it.
      </p>
      <p>
        If that isn&apos;t your current plan, your insurer can confirm what&apos;s active, the member services number is
        usually on your card. You can also leave your email below and we&apos;ll tell you when Legion can accept these plans.
      </p>
    </section>
  );
}

function NotifyMe({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saved, setSaved] = useState(Boolean(initialEmail));
  const [error, setError] = useState<string>();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look right. Please check it.");
      return;
    }
    setError(undefined);
    // Doubles as the multi-state waitlist email when the patient is outside the served states.
    updateAnswers({ notifyEmail: email.trim(), waitlistEmail: email.trim() });
    setSaved(true);
  }

  if (saved) {
    return (
      <section aria-labelledby="notify" className="flex flex-col gap-2">
        <h2 id="notify" className="text-lg font-semibold">
          Get an email if this changes
        </h2>
        <p role="status">
          Saved. We&apos;ll only use {email} to tell you if Legion can see you in the future. In this prototype, nothing is
          sent.
        </p>
        <button type="button" onClick={() => setSaved(false)} className="self-start text-accent underline underline-offset-2">
          Change email
        </button>
      </section>
    );
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="notify" className="flex flex-col gap-3">
      <h2 id="notify" className="text-lg font-semibold">
        Get an email if this changes
      </h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="notify-email" className="font-medium">
          Email
        </label>
        <p id="notify-purpose" className="text-sm text-ink-muted">
          We&apos;ll only use this to tell you if Legion can see you in the future. Nothing else. In this prototype,
          nothing is sent.
        </p>
      </div>
      {error && (
        <p id="notify-error" className="text-caution">
          {error}
        </p>
      )}
      <input
        id="notify-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-describedby={`notify-purpose${error ? " notify-error" : ""}`}
        aria-invalid={Boolean(error)}
        className={`min-h-12 rounded-md border bg-surface px-3 text-base ${error ? "border-caution" : "border-line"}`}
      />
      <PrimaryButton type="submit" className="self-start">
        Email me
      </PrimaryButton>
    </form>
  );
}
