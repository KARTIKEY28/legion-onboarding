"use client";

import { useEffect, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { personalizedPay, templateCost, type CostPath, type CostSummary } from "@/ai/cost";
import { reasonsTemplate } from "@/ai/matchReasons";
import { CLINICIANS } from "@/clinicians/data";
import { facts, matchInputFromAnswers } from "@/clinicians/match";
import { roleLabel } from "@/clinicians/roles";
import { ActionBar, LoadingScreen, PrimaryLink, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { Portrait } from "@/components/Portrait";
import { samplePayers } from "@/facts";
import { formatCentral } from "@/time";
import { getAnswers, updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const CLIENT_TIMEOUT_MS = 3000;

async function fetchSummary(path: CostPath): Promise<CostSummary> {
  const template: CostSummary = { sections: templateCost(path), source: "template" };
  if (!navigator.onLine) return template;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/cost-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
      signal: controller.signal,
    });
    if (!response.ok) return template;
    const result = (await response.json()) as CostSummary;
    return result.sections?.pay ? result : template;
  } catch {
    return template;
  } finally {
    clearTimeout(timer);
  }
}

/** The plan name to show in "What you pay": a known plan's label, or the one typed under "Other". */
function planName(answers: SessionAnswers): string | undefined {
  const ins = answers.insurance;
  if (!ins || ins.path !== "insured") return undefined;
  if (ins.payerId && ins.payerId !== "other") return samplePayers.value.find((p) => p.id === ins.payerId)?.label;
  if (ins.payerId === "other") return ins.payerOther;
  return undefined;
}

export default function CostPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;

  const path = answers.insurance?.path ?? "not_sure";
  const payLines = personalizedPay(path, planName(answers), answers.insurance?.addLater);

  // One reason line for the visit card, built from the same facts as the match.
  const selected = answers.selectedClinician;
  const clinician = selected ? CLINICIANS.find((c) => c.id === selected.id) : undefined;
  const reason = clinician ? reasonsTemplate(facts(clinician, matchInputFromAnswers(answers)))[0] : undefined;

  return (
    <CostScreen
      path={path}
      payLines={payLines}
      clinicianId={selected?.id}
      clinician={selected?.name}
      role={clinician ? roleLabel[clinician.role] : undefined}
      reason={reason}
      slotIso={answers.selectedSlot?.iso}
    />
  );
}

/** Charged and cancellation come from the AI summary; "What you pay" is personalized separately. */
const SECONDARY_SECTIONS = [
  { key: "charged", heading: "When you're charged" },
  { key: "cancel", heading: "If you need to cancel" },
] as const;

/** The clinician and time the patient picked on Match, with a link back to change it. */
function ChosenVisit({
  clinicianId,
  clinician,
  role,
  reason,
  slotIso,
}: {
  clinicianId?: string;
  clinician: string;
  role?: string;
  reason?: string;
  slotIso?: string;
}) {
  return (
    <section aria-label="Your chosen visit" className="flex items-start gap-3 rounded-lg bg-accent-soft p-4">
      {clinicianId && <Portrait id={clinicianId} name={clinician} size={48} />}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">Your first visit</p>
        <p className="text-lg font-semibold">{clinician}</p>
        {role && <p className="text-sm text-ink-muted">{role}</p>}
        {reason && <p className="text-sm">{reason}</p>}
        <p className="text-sm text-ink-muted">Video visit</p>
        {/* Visit length is unknown (see docs/DECISIONS.md), so it is not shown. */}
        {slotIso && <p className="text-base">{formatCentral(slotIso)}</p>}
        <TextLink href="/match" className="self-start text-sm">
          Change
        </TextLink>
      </div>
    </section>
  );
}

function CostScreen({
  path,
  payLines,
  clinicianId,
  clinician,
  role,
  reason,
  slotIso,
}: {
  path: CostPath;
  payLines: string[];
  clinicianId?: string;
  clinician?: string;
  role?: string;
  reason?: string;
  slotIso?: string;
}) {
  const [summary, setSummary] = useState<CostSummary | null>(() => getAnswers().costSummaries?.[path] ?? null);
  useTrackOnce("cost.viewed", "cost.viewed", () => ({ insurance_path: path }));

  useEffect(() => {
    let cancelled = false;
    const show = (result: CostSummary) => {
      if (cancelled) return;
      setSummary(result);
      trackOnce(`cost_summary.shown:${path}`, "cost_summary.shown", { source: result.source });
      if (result.validationFailed) {
        trackOnce(`cost_summary.validation_failed:${path}`, "cost_summary.validation_failed", { reason: result.validationFailed });
      }
    };
    const cached = getAnswers().costSummaries?.[path];
    if (cached) {
      show(cached);
    } else {
      fetchSummary(path).then((result) => {
        updateAnswers({ costSummaries: { ...getAnswers().costSummaries, [path]: result } });
        show(result);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Screen>
      <Progress step="cost" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Cost and terms</h1>
        <p className="text-ink-muted">Here&apos;s everything before you create an account or add a card.</p>
      </div>

      {clinician && (
        <ChosenVisit clinicianId={clinicianId} clinician={clinician} role={role} reason={reason} slotIso={slotIso} />
      )}

      <div className="flex flex-col gap-4">
        {/* What you pay: personalized from the patient's path and plan. */}
        <section aria-labelledby="cost-pay-heading" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
          <h2 id="cost-pay-heading" className="text-lg font-semibold">
            What you pay
          </h2>
          <div data-testid="cost-pay" data-source="personalized" className="flex flex-col gap-2">
            {payLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <div aria-busy={!summary} aria-live="polite" className="flex flex-col gap-4">
          {SECONDARY_SECTIONS.map(({ key, heading }) => (
            <section key={key} aria-labelledby={`cost-${key}`} className="flex flex-col gap-2 rounded-lg bg-surface p-4">
              <h2 id={`cost-${key}`} className="text-lg font-semibold">
                {heading}
              </h2>
              {summary ? (
                <p data-testid={`cost-${key}`} data-source={summary.source}>
                  {summary.sections[key]}
                </p>
              ) : (
                <span className="block h-5 w-5/6 animate-pulse rounded-md bg-line" aria-label="Loading" />
              )}
            </section>
          ))}
        </div>
      </div>

      <ActionBar backHref="/match">
        <PrimaryLink
          href="/account"
          className={barPrimary}
          onClick={() => trackOnce("reservation.requested", "reservation.requested")}
        >
          Continue to create your account
        </PrimaryLink>
      </ActionBar>
    </Screen>
  );
}
