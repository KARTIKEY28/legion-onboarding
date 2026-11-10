"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTracker } from "@/analytics/client";
import { trackOnce } from "@/analytics/hooks";
import { ClinicianProfile } from "@/components/ClinicianProfile";
import { Portrait } from "@/components/Portrait";
import { roleLabel } from "@/clinicians/roles";
import { cardEvidenceLine } from "@/ai/matchReasons";
import { templateReflection, type ReflectInput, type Reflection } from "@/ai/reflect";
import {
  allRanked,
  cardEvidence,
  matchClinicians,
  matchInputFromAnswers,
  widenGains,
  type MatchInput,
  type RankedMatch,
} from "@/clinicians/match";
import type { EvidenceTier } from "@/clinicians/match";
import { nextSlots, openSlots, type Slot } from "@/clinicians/schedule";
import { type AvailabilityWindow } from "@/clinicians/model";
import { concernPhrase, joinPhrases, languagePhrase } from "@/data/phrases";
import { estimateFromAnswers, estimateLine } from "@/data/estimate";
import { LoadingScreen, Progress, Screen, TextLink } from "@/components/ui";
import { formatCentral } from "@/time";
import { isWithinCancellationWindow, under48Line } from "@/payment/summary";
import { slotTakenArmed } from "@/devtoggles";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const tierKey = (e: EvidenceTier) => (e.tier === 3 ? "outcomes" : e.tier === 2 ? "experience" : "declared_fit");

const CLIENT_TIMEOUT_MS = 3000;
const DEV_LABEL = process.env.NEXT_PUBLIC_SHOW_DEV_LABEL === "1";

const TIME_CHIPS: { id: "any" | AvailabilityWindow; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "weekday_mornings", label: "Mornings" },
  { id: "weekday_afternoons", label: "Afternoons" },
  { id: "weekday_evenings", label: "Evenings" },
  { id: "weekends", label: "Weekends" },
];

type Selection = { match: RankedMatch; slot: Slot; from: "top_match" | "full_list"; rank: number; source: "card" | "profile" };

async function fetchHeadline(input: ReflectInput): Promise<Reflection> {
  const template: Reflection = { text: templateReflection(input), source: "template" };
  if (!navigator.onLine) return template;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/reflect-back", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!res.ok) return template;
    const result = (await res.json()) as Reflection;
    return result.text ? result : template;
  } catch {
    return template;
  } finally {
    clearTimeout(timer);
  }
}

export default function MatchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MatchGate />
    </Suspense>
  );
}

function MatchGate() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  return <MatchView answers={answers} />;
}

function MatchView({ answers }: { answers: SessionAnswers }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useRef(new Date()).current;
  const baseInput = useMemo(() => matchInputFromAnswers(answers), [answers]);
  const result = useMemo(() => matchClinicians(baseInput, now), [baseInput, now]);
  const estimate = useMemo(() => estimateFromAnswers(answers), [answers]);

  const [timeFilter, setTimeFilter] = useState<"any" | AvailabilityWindow>("any");
  const [noneSelected, setNoneSelected] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [takenFor, setTakenFor] = useState<string | null>(null);
  const consumed = useRef(false);
  const [headline, setHeadline] = useState<Reflection | null>(null);

  const everyone = useMemo(() => allRanked(baseInput, now), [baseInput, now]);
  const inWindow = useMemo(
    () => (timeFilter === "any" ? everyone : everyone.filter((m) => openSlots(m.clinician, now, [timeFilter]).length > 0)),
    [everyone, timeFilter, now],
  );
  const noStrong = result.noStrongMatch || noneSelected;
  const cards = showAll ? inWindow : inWindow.slice(0, 3);
  const tooFew = timeFilter !== "any" && inWindow.length < 3;

  // match.viewed once.
  useEffect(() => {
    trackOnce("match.viewed", "match.viewed", { match_count: cards.length, no_strong_match: noStrong });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The model-phrased headline (no time windows now). Phrases only.
  useEffect(() => {
    let cancelled = false;
    const labels: ReflectInput = {
      step: "match",
      topics: baseInput.topics.map((t) => concernPhrase[t]),
      windows: [],
      language: baseInput.language ? languagePhrase[baseInput.language] : undefined,
    };
    fetchHeadline(labels).then((r) => {
      if (cancelled) return;
      setHeadline(r);
      trackOnce("reflect_back.shown:match", "reflect_back.shown", { source: r.source, on_step: "match" });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function slotsFor(match: RankedMatch): Slot[] {
    return timeFilter === "any"
      ? nextSlots(match.clinician, now, undefined, 4)
      : nextSlots(match.clinician, now, [timeFilter], 4);
  }

  function select(match: RankedMatch, slot: Slot, from: "top_match" | "full_list", rank: number, source: "card" | "profile") {
    if (slotTakenArmed() && !consumed.current) {
      consumed.current = true;
      setTakenFor(match.clinician.id);
      getTracker()("slot.unavailable_at_booking", { on_step: "match" });
      return;
    }
    setSelection({ match, slot, from, rank, source });
    getTracker()("slot.selected");
    if (searchParams.get("clinician")) router.back(); // close the profile if it was open
  }

  function continueBooking() {
    if (!selection) return;
    const { match, slot, from, source, rank } = selection;
    updateAnswers({
      selectedClinician: { id: match.clinician.id, name: match.clinician.name },
      selectedSlot: { iso: slot.iso, label: formatCentral(slot.iso) },
    });
    getTracker()("provider.selected", { from, source, rank, evidence_tier: tierKey(match.evidence) });
    router.push("/cost");
  }

  function changeTimeFilter(value: "any" | AvailabilityWindow) {
    setTimeFilter(value);
    setSelection(null);
    getTracker()("match.time_filter_changed", { value });
  }

  function openFullList() {
    trackOnce("match.full_list_opened", "match.full_list_opened");
    setShowAll(true);
  }

  function noneFeelRight() {
    getTracker()("match.none_selected");
    setNoneSelected(true);
    setShowAll(false);
  }

  // Profile sheet, driven by the URL (?clinician=id).
  const openId = searchParams.get("clinician");
  const openMeta = useRef<{ from: "card" | "full_list"; rank: number }>({ from: "card", rank: 0 });
  const firedProfile = useRef<string | null>(null);
  const openMatch = useMemo(
    () => (openId ? everyone.find((m) => m.clinician.id === openId) ?? null : null),
    [openId, everyone],
  );
  function openProfile(id: string, from: "card" | "full_list", rank: number) {
    openMeta.current = { from, rank };
    router.push(`/match?clinician=${id}`, { scroll: false });
  }
  function closeProfile() {
    router.back();
  }
  useEffect(() => {
    if (openId && firedProfile.current !== openId) {
      firedProfile.current = openId;
      getTracker()("profile.opened", { from: openMeta.current.from, rank: openMeta.current.rank });
    }
    if (!openId) firedProfile.current = null;
  }, [openId]);

  return (
    <Screen>
      <Progress step="match" />

      <div className="flex flex-col gap-2">
        {headline ? (
          <h1 className="text-2xl font-semibold" data-source={headline.source} data-testid="match-headline">
            {headline.text}
          </h1>
        ) : (
          <span className="block h-8 w-5/6 animate-pulse rounded-md bg-line" aria-label="Finding clinicians" />
        )}
        <p data-testid="match-cost-line" className="text-sm text-ink-muted">
          {estimateLine(estimate)}
        </p>
      </div>

      {/* Time-of-day filter chips */}
      <div role="group" aria-label="Filter by time of day" className="flex flex-wrap gap-2">
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={timeFilter === chip.id}
            onClick={() => changeTimeFilter(chip.id)}
            className={`min-h-11 rounded-full border px-4 py-2 text-base ${
              timeFilter === chip.id ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {noStrong && (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-3">
          We couldn&apos;t find a clinician who fits everything you asked for. Here are the closest options, and you can
          widen your search.
        </p>
      )}

      {tooFew && (
        <p role="status" className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          Only a few clinicians have {TIME_CHIPS.find((c) => c.id === timeFilter)?.label.toLowerCase()} openings.
          <button type="button" onClick={() => changeTimeFilter("any")} className="text-accent underline underline-offset-2">
            Show any time
          </button>
        </p>
      )}

      {!showAll && (
        <ul className="flex flex-col gap-4">
          {cards.map((match, i) => (
            <li key={match.clinician.id}>
              <ClinicianCard
                match={match}
                slots={slotsFor(match)}
                timeFilter={timeFilter}
                filler={!match.strong}
                selectedIso={selection?.match.clinician.id === match.clinician.id ? selection.slot.iso : null}
                taken={takenFor === match.clinician.id}
                onPick={(slot) => select(match, slot, "top_match", i + 1, "card")}
                onOpenProfile={() => openProfile(match.clinician.id, "card", i + 1)}
                onChooseAnother={() => setTakenFor(null)}
              />
            </li>
          ))}
        </ul>
      )}

      {showAll && (
        <section aria-label="All clinicians" className="flex flex-col gap-4">
          <p className="text-ink-muted">All clinicians with openings, most relevant first.</p>
          <ul className="flex flex-col gap-4">
            {inWindow.map((match, i) => (
              <li key={match.clinician.id}>
                <ClinicianCard
                  match={match}
                  slots={slotsFor(match)}
                  timeFilter={timeFilter}
                  filler={!match.strong}
                  selectedIso={selection?.match.clinician.id === match.clinician.id ? selection.slot.iso : null}
                  taken={takenFor === match.clinician.id}
                  onPick={(slot) => select(match, slot, "full_list", i + 1, "card")}
                  onOpenProfile={() => openProfile(match.clinician.id, "full_list", i + 1)}
                  onChooseAnother={() => setTakenFor(null)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {noStrong ? (
        <WidenAndHelp input={baseInput} now={now} answers={answers} />
      ) : (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          {!showAll ? (
            <button type="button" onClick={openFullList} className="self-start text-accent underline underline-offset-2">
              See all clinicians
            </button>
          ) : (
            <button type="button" onClick={() => setShowAll(false)} className="self-start text-accent underline underline-offset-2">
              Back to your top matches
            </button>
          )}
          <button type="button" onClick={noneFeelRight} className="self-start text-accent underline underline-offset-2">
            None of these feel right
          </button>
        </div>
      )}

      <TextLink href="/needs">Back</TextLink>

      {/* Extra space so the sticky confirm bar never hides the last control. */}
      {selection && <div aria-hidden className="h-40" />}

      {openMatch && (
        <ClinicianProfile
          clinician={openMatch.clinician}
          input={baseInput}
          now={now}
          onClose={closeProfile}
          onPick={(slot) =>
            select(
              openMatch,
              slot,
              openMeta.current.from === "full_list" ? "full_list" : "top_match",
              openMeta.current.rank || 1,
              "profile",
            )
          }
        />
      )}

      {selection && (
        <ConfirmBar
          selection={selection}
          estimate={estimateLine(estimate)}
          under48={isWithinCancellationWindow(selection.slot.iso, now) ? under48Line() : null}
          onContinue={continueBooking}
        />
      )}
    </Screen>
  );
}

function ConfirmBar({
  selection,
  estimate,
  under48,
  onContinue,
}: {
  selection: Selection;
  estimate: string;
  under48: string | null;
  onContinue: () => void;
}) {
  const { clinician } = selection.match;
  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur"
      style={{ bottom: DEV_LABEL ? 52 : 0 }}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        <Portrait id={clinician.id} name={clinician.name} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">
            {clinician.name} · {formatCentral(selection.slot.iso)}
          </p>
          <p className="truncate text-xs text-ink-muted">{estimate}</p>
          {under48 && <p className="truncate text-xs text-danger">{under48}</p>}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-11 shrink-0 rounded-md bg-accent px-6 py-2 text-base font-medium text-accent-ink"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ClinicianCard({
  match,
  slots,
  timeFilter,
  filler,
  selectedIso,
  taken,
  onPick,
  onOpenProfile,
  onChooseAnother,
}: {
  match: RankedMatch;
  slots: Slot[];
  timeFilter: "any" | AvailabilityWindow;
  filler: boolean;
  selectedIso: string | null;
  taken: boolean;
  onPick: (slot: Slot) => void;
  onOpenProfile: () => void;
  onChooseAnother: () => void;
}) {
  const { clinician, facts } = match;
  const evLine = cardEvidenceLine(cardEvidence(clinician), facts);
  const remaining = taken ? slots.slice(1) : slots.slice(0, 2);

  const concernReason = facts.matchedTopicIds.length
    ? `Focuses on ${joinPhrases(facts.matchedTopicIds.map((id) => concernPhrase[id]))}`
    : null;
  const timeReason =
    timeFilter === "any"
      ? slots[0]
        ? `Next opening: ${formatCentral(slots[0].iso)}`
        : null
      : `${TIME_CHIPS.find((c) => c.id === timeFilter)?.label} openings`;
  const planOrLang = facts.payer ? `Takes ${facts.payer}` : facts.language ? `Speaks ${languagePhrase[facts.language]}` : null;
  const reasons = [concernReason, timeReason, planOrLang].filter((r): r is string => Boolean(r)).slice(0, 3);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpenProfile} aria-label={`Open ${clinician.name}'s profile`}>
          <Portrait id={clinician.id} name={clinician.name} size={44} />
        </button>
        <div className="flex flex-col">
          <p className="text-base font-semibold leading-tight">
            <button type="button" onClick={onOpenProfile} className="text-left underline-offset-2 hover:underline">
              {clinician.name}
            </button>{" "}
            {clinician.pronouns && <span className="text-sm font-normal text-ink-muted">({clinician.pronouns})</span>}
          </p>
          <p className="text-sm text-ink-muted">
            {roleLabel[clinician.role]}
            {filler && <span> · Also available</span>}
          </p>
        </div>
      </div>

      {reasons.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-sm">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden className="text-accent">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {evLine && <p className="text-xs text-ink-muted">{evLine}</p>}

      {taken && (
        <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm">
          That time was just taken. Nothing holds a slot until you book. Here are the next openings, or you can choose
          another clinician.
        </p>
      )}

      {remaining.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {remaining.map((slot) => {
            const isSelected = slot.iso === selectedIso;
            return (
              <button
                key={slot.iso}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onPick(slot)}
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium ${
                  isSelected ? "border-accent bg-accent text-accent-ink" : "border-accent bg-accent-soft"
                }`}
              >
                {formatCentral(slot.iso)}
              </button>
            );
          })}
          {!taken && (
            <button type="button" onClick={onOpenProfile} className="text-sm text-accent underline underline-offset-2">
              More times
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No openings in this time of day.</p>
      )}

      {taken && (
        <button type="button" onClick={onChooseAnother} className="self-start text-sm text-accent underline underline-offset-2">
          Choose another clinician
        </button>
      )}
    </article>
  );
}

function WidenAndHelp({ input, now, answers }: { input: MatchInput; now: Date; answers: SessionAnswers }) {
  const gains = widenGains(input, now);
  return (
    <section aria-label="Widen your search" className="flex flex-col gap-3 border-t border-line pt-4">
      <h2 className="text-lg font-semibold">Widen your search</h2>
      <p className="text-ink-muted">
        Prefer to talk to someone?{" "}
        {/* Placeholder contact; see docs/DECISIONS.md. */}
        <a href="mailto:help@example.com" className="text-accent underline underline-offset-2">
          Get help finding care
        </a>
      </p>
      {gains.any_language && (
        <p className="text-sm text-ink-muted">Opening up the language would add {gains.any_language} more.</p>
      )}
      <NotifyMe initialEmail={answers.notifyEmail} />
    </section>
  );
}

function NotifyMe({ initialEmail }: { initialEmail?: string }) {
  const [open, setOpen] = useState(false);
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
    updateAnswers({ notifyEmail: email.trim() });
    setSaved(true);
  }

  if (saved) {
    return (
      <p role="status" className="text-ink-muted">
        Saved. We&apos;ll email {email} if more openings come up. In this prototype, nothing is sent.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-accent underline underline-offset-2">
        Tell me when more openings come up
      </button>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="notify-email" className="font-medium">
        Tell me when more openings come up
      </label>
      <p id="notify-purpose" className="text-sm text-ink-muted">
        We&apos;ll only use this to tell you about openings. In this prototype, nothing is sent.
      </p>
      {error && (
        <p id="notify-error" className="text-danger">
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
        className={`min-h-11 rounded-md border bg-surface px-3 text-base ${error ? "border-danger" : "border-line"}`}
      />
      <button type="submit" className="min-h-11 self-start rounded-md border border-accent bg-surface px-6 py-2 font-medium text-accent">
        Email me
      </button>
    </form>
  );
}
