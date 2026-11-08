"use client";

import { useEffect, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { templateCost, type CostPath, type CostSummary } from "@/ai/cost";
import { ActionBar, LoadingScreen, PrimaryLink, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { Portrait } from "@/components/Portrait";
import { formatCentral } from "@/time";
import { getAnswers, updateAnswers, useAnswers } from "@/session/store";

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

export default function CostPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  return (
    <CostScreen
      path={answers.insurance?.path ?? "not_sure"}
      clinicianId={answers.selectedClinician?.id}
      clinician={answers.selectedClinician?.name}
      slotIso={answers.selectedSlot?.iso}
    />
  );
}

const SECTIONS = [
  { key: "pay", heading: "What you pay" },
  { key: "charged", heading: "When you're charged" },
  { key: "cancel", heading: "If you need to cancel" },
] as const;

/** The clinician and time the patient picked on Match, with a link back to change it. */
function ChosenVisit({ clinicianId, clinician, slotIso }: { clinicianId?: string; clinician: string; slotIso?: string }) {
  return (
    <section aria-label="Your chosen visit" className="flex items-start gap-3 rounded-lg bg-accent-soft p-4">
      {clinicianId && <Portrait id={clinicianId} name={clinician} size={48} />}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">Your first visit</p>
        <p className="text-lg font-semibold">{clinician}</p>
        <p className="text-sm text-ink-muted">Video visit</p>
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
  clinicianId,
  clinician,
  slotIso,
}: {
  path: CostPath;
  clinicianId?: string;
  clinician?: string;
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

      {clinician && <ChosenVisit clinicianId={clinicianId} clinician={clinician} slotIso={slotIso} />}

      <div aria-busy={!summary} aria-live="polite" className="flex flex-col gap-4">
        {SECTIONS.map(({ key, heading }) => (
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
