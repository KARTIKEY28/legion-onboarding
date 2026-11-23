"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, barPrimary } from "@/components/ui";
import { effort, selfPayPrices } from "@/facts";
import { stateFromZip } from "@/data/zip";
import { updateAnswers, useAnswers } from "@/session/store";
import { StartTracker } from "./StartTracker";

export default function StartPage() {
  const router = useRouter();
  const answers = useAnswers();
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string>();

  if (!answers) return <LoadingScreen />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const derived = stateFromZip(zip);
    if (derived === null) {
      setError("Please enter your 5-digit ZIP code.");
      return;
    }
    setError(undefined);
    const served = derived !== "other";
    // Location is decided here, from the ZIP, and never asked again.
    trackOnce(`eligibility.checked:texas:${served ? "pass" : "fail"}:start`, "eligibility.checked", {
      criterion: "texas",
      result: served ? "pass" : "fail",
      on_step: "start",
    });
    updateAnswers({
      zip: zip.trim(),
      state: served ? derived : undefined,
      inTexas: derived === "TX" ? "yes" : derived === "other" ? "no" : undefined,
      exclusions: served ? [] : ["texas"],
    });
    router.push(served ? "/about" : "/next-steps");
  }

  return (
    <Screen>
      <StartTracker />
      <Progress step="start" />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Let&apos;s find you a clinician</h1>
        <p className="text-ink-muted">A few quick questions, and you&apos;ll see your matches before you book.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="zip" className="text-base font-medium">
            What&apos;s your ZIP code?
          </label>
          <p id="zip-reason" className="text-sm text-ink-muted">
            Legion&apos;s clinicians are licensed by state, so this confirms we can see you and shows times in your time zone.
          </p>
          {error && (
            <p id="zip-error" role="alert" className="text-caution">
              {error}
            </p>
          )}
          <input
            id="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="ZIP code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            aria-describedby={`zip-reason${error ? " zip-error" : ""}`}
            aria-invalid={Boolean(error)}
            className={`min-h-12 w-full max-w-40 rounded-md border bg-surface px-3 text-base text-ink ${
              error ? "border-caution" : "border-line"
            }`}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm text-ink-muted">
          <p>Often just your copay with insurance, ${selfPayPrices.initialVisit.value} without. We&apos;ll estimate before you book.</p>
          <p>It takes about {effort.minutesToPayment.value} minutes.</p>
        </div>

        <ActionBar>
          <PrimaryButton type="submit" className={barPrimary}>
            Continue
          </PrimaryButton>
        </ActionBar>
      </form>
    </Screen>
  );
}
