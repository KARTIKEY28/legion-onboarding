"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getTracker } from "@/analytics/client";
import { ClinicianProfile } from "@/components/ClinicianProfile";
import { ConfirmBar } from "@/components/ConfirmBar";
import { IntroCallSheet } from "@/components/IntroCallSheet";
import { LoadingScreen, Screen, TextLink } from "@/components/ui";
import { CLINICIANS } from "@/clinicians/data";
import { evidenceTier, matchInputFromAnswers, type EvidenceTier, type MatchInput } from "@/clinicians/match";
import type { Slot } from "@/clinicians/schedule";
import { estimateFromAnswers, estimateLine } from "@/data/estimate";
import { isWithinCancellationWindow, under48Line } from "@/payment/summary";
import { formatInZone } from "@/time";
import { getAnswers, updateAnswers, useAnswers } from "@/session/store";

const tierKey = (e: EvidenceTier) => (e.tier === 3 ? "outcomes" : e.tier === 2 ? "experience" : "declared_fit");

export default function ClinicianPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClinicianGate />
    </Suspense>
  );
}

function ClinicianGate() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const answers = useAnswers();
  const clinician = CLINICIANS.find((c) => c.id === params.id);

  // No such clinician (or a stale link): send the patient back to the list.
  useEffect(() => {
    if (answers && !clinician) router.replace("/match");
  }, [answers, clinician, router]);

  if (!answers) return <LoadingScreen />;
  if (!clinician) return <LoadingScreen />;
  return <ClinicianView />;
}

function ClinicianView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const answers = useAnswers()!;
  const now = useRef(new Date()).current;
  const clinician = CLINICIANS.find((c) => c.id === params.id)!;

  const from = searchParams.get("from") === "full_list" ? "full_list" : "card";
  const source = (searchParams.get("source") ?? "name") as "name" | "photo" | "more_times";
  const rank = Number(searchParams.get("rank") ?? "1") || 1;

  // The patient's saved filters shape the "why we matched" sentences.
  const saved = answers.matchFilters;
  const baseInput = matchInputFromAnswers(answers);
  const input: MatchInput = {
    ...baseInput,
    language: saved && saved.language !== "any" ? saved.language : undefined,
    gender: saved && saved.gender !== "any" ? saved.gender : undefined,
  };
  const estimate = estimateLine(estimateFromAnswers(answers));
  const state = baseInput.state;

  const [slot, setSlot] = useState<Slot | null>(null);
  const [introOpen, setIntroOpen] = useState(false);

  // profile.opened once per mount (the page replaces the old drawer event).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    getTracker()("profile.opened", { from: from === "full_list" ? "full_list" : "card", source, rank });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(s: Slot) {
    setSlot(s);
    getTracker()("slot.selected");
  }

  function continueBooking() {
    if (!slot) return;
    updateAnswers({
      selectedClinician: { id: clinician.id, name: clinician.name },
      selectedSlot: { iso: slot.iso, label: formatInZone(slot.iso, state) },
    });
    getTracker()("provider.selected", {
      from: from === "full_list" ? "full_list" : "top_match",
      source: "profile",
      rank,
      evidence_tier: tierKey(evidenceTier(clinician)),
    });
    router.push("/cost");
  }

  function addInsurance() {
    const back = `/clinician/${clinician.id}`;
    router.push(`/insurance?returnTo=${encodeURIComponent(back)}`);
  }

  function backToMatches() {
    // Prefer a history back so scroll is restored; fall back to a push.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/match");
  }

  const deepLink = source === "more_times" || (typeof window !== "undefined" && window.location.hash === "#availability");

  return (
    <Screen>
      <button
        type="button"
        onClick={backToMatches}
        className="self-start text-accent underline underline-offset-2"
      >
        ← Back to matches
      </button>

      <ClinicianProfile
        clinician={clinician}
        input={input}
        now={now}
        estimate={estimate}
        hasInsurance={getAnswers().insurance?.path === "insured"}
        onAddInsurance={addInsurance}
        deepLinkAvailability={deepLink}
        onRequestIntro={() => setIntroOpen(true)}
        onPick={pick}
      />

      {/* Space so the sticky confirm bar never hides the last control. */}
      {slot && <div aria-hidden className="h-40" />}
      <TextLink href="/match" className="self-start">
        Back to matches
      </TextLink>

      {slot && (
        <ConfirmBar
          clinician={clinician}
          slotIso={slot.iso}
          estimate={estimate}
          under48={isWithinCancellationWindow(slot.iso, now) ? under48Line() : null}
          state={state}
          onContinue={continueBooking}
        />
      )}

      {introOpen && (
        <IntroCallSheet clinician={clinician} state={state} now={now} onClose={() => setIntroOpen(false)} />
      )}
    </Screen>
  );
}
