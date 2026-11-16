"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTracker } from "@/analytics/client";
import { trackOnce } from "@/analytics/hooks";
import { ConfirmBar } from "@/components/ConfirmBar";
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
import { CLINICIAN_GENDERS, LANGUAGES, type AvailabilityWindow, type ClinicianGender, type LanguageId } from "@/clinicians/model";
import { concernPhrase, joinPhrases, languagePhrase } from "@/data/phrases";
import type { TopicId } from "@/facts";
import { estimateFromAnswers, estimateLine } from "@/data/estimate";
import { parseSearch } from "@/data/searchParse";
import { SafeFreeText } from "@/components/safety";
import { LoadingScreen, Progress, Screen, TextLink, secondaryClass } from "@/components/ui";
import { formatInZone, type UsState } from "@/time";
import { isWithinCancellationWindow, under48Line } from "@/payment/summary";
import { slotTakenArmed } from "@/devtoggles";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const tierKey = (e: EvidenceTier) => (e.tier === 3 ? "outcomes" : e.tier === 2 ? "experience" : "declared_fit");

const CLIENT_TIMEOUT_MS = 3000;
/** Tappable example searches, so the demo path is reliable. Each parses to real filters. */
const SEARCH_EXAMPLES = [
  "A Spanish-speaking clinician for depression and ADHD",
  "A woman psychiatrist for anxiety",
  "A Latina clinician who understands my culture",
];

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
  const now = useRef(new Date()).current;
  const baseInput = useMemo(() => matchInputFromAnswers(answers), [answers]);
  const result = useMemo(() => matchClinicians(baseInput, now), [baseInput, now]);
  const estimate = useMemo(() => estimateFromAnswers(answers), [answers]);

  // Restore the filters (and later the scroll) saved when the patient left to a
  // clinician page, so "Back to matches" keeps their place. Falls back to the
  // language/gender they gave earlier.
  const saved = answers.matchFilters;
  const [timeFilter, setTimeFilter] = useState<"any" | AvailabilityWindow>(saved?.time ?? "any");
  const [languageFilter, setLanguageFilter] = useState<"any" | LanguageId>(saved?.language ?? answers.needs?.language ?? "any");
  const [genderFilter, setGenderFilter] = useState<"any" | ClinicianGender>(saved?.gender ?? answers.needs?.gender ?? "any");
  // Filters that only the search box sets: conditions and a shared cultural background.
  const [topicFilters, setTopicFilters] = useState<TopicId[]>(saved?.topics ?? []);
  const [culturalFilter, setCulturalFilter] = useState(saved?.cultural ?? false);
  const [note, setNote] = useState(answers.needs?.note ?? "");
  const [searched, setSearched] = useState(false);
  const [noneSelected, setNoneSelected] = useState(false);
  const [showAll, setShowAll] = useState(saved?.showAll ?? false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [takenFor, setTakenFor] = useState<string | null>(null);
  const consumed = useRef(false);
  const [headline, setHeadline] = useState<Reflection | null>(null);

  // Language and gender are live, soft filter chips (never a hard constraint),
  // applied over the full pool alongside the time-of-day filter.
  const everyone = useMemo(() => allRanked(baseInput, now), [baseInput, now]);
  const filtersActive =
    timeFilter !== "any" || languageFilter !== "any" || genderFilter !== "any" || topicFilters.length > 0 || culturalFilter;
  const visible = useMemo(
    () =>
      everyone.filter(
        (m) =>
          (timeFilter === "any" || openSlots(m.clinician, now, [timeFilter]).length > 0) &&
          (languageFilter === "any" || m.clinician.languages.includes(languageFilter)) &&
          (genderFilter === "any" || m.clinician.gender === genderFilter) &&
          (topicFilters.length === 0 || topicFilters.some((t) => m.clinician.specialties.includes(t))) &&
          (!culturalFilter || Boolean(m.clinician.culturalBackground)),
      ),
    [everyone, timeFilter, languageFilter, genderFilter, topicFilters, culturalFilter, now],
  );
  const noStrong = result.noStrongMatch || noneSelected;
  const cards = showAll ? visible : visible.slice(0, 3);
  const tooFew = filtersActive && visible.length < 3;
  // The search ran but mapped to no filters: show everyone with a gentle note.
  const searchedNothing = searched && !filtersActive;

  function resetFilters() {
    setTimeFilter("any");
    setLanguageFilter("any");
    setGenderFilter("any");
    setTopicFilters([]);
    setCulturalFilter(false);
    setSelection(null);
  }

  /** The active filters, as removable chips. Also the source of the search_used event. */
  const appliedFilters: { key: string; token: string; label: string; remove: () => void }[] = [];
  if (languageFilter !== "any")
    appliedFilters.push({ key: "lang", token: languageFilter, label: languagePhrase[languageFilter], remove: () => changeLanguageFilter("any") });
  if (genderFilter !== "any")
    appliedFilters.push({
      key: "gender",
      token: genderFilter,
      label: CLINICIAN_GENDERS.find((g) => g.id === genderFilter)?.label ?? "",
      remove: () => changeGenderFilter("any"),
    });
  if (timeFilter !== "any")
    appliedFilters.push({ key: "time", token: timeFilter, label: TIME_CHIPS.find((c) => c.id === timeFilter)?.label ?? "", remove: () => changeTimeFilter("any") });
  for (const t of topicFilters)
    appliedFilters.push({ key: `topic-${t}`, token: t, label: concernPhrase[t], remove: () => setTopicFilters((cur) => cur.filter((x) => x !== t)) });
  if (culturalFilter)
    appliedFilters.push({ key: "cultural", token: "cultural", label: "Shared cultural background", remove: () => setCulturalFilter(false) });

  /** Deterministic parse of the search text into the existing filters. */
  function runSearch(text: string) {
    setSearched(true);
    const parsed = parseSearch(text);
    if (parsed.language) setLanguageFilter(parsed.language);
    if (parsed.gender) setGenderFilter(parsed.gender);
    if (parsed.time) setTimeFilter(parsed.time);
    if (parsed.topics.length) setTopicFilters(parsed.topics);
    setCulturalFilter(parsed.cultural);
    setSelection(null);
    const tokens: (TopicId | LanguageId | ClinicianGender | AvailabilityWindow | "cultural")[] = [];
    if (parsed.language) tokens.push(parsed.language);
    if (parsed.gender) tokens.push(parsed.gender);
    if (parsed.time) tokens.push(parsed.time);
    tokens.push(...parsed.topics);
    if (parsed.cultural) tokens.push("cultural");
    getTracker()("match.search_used", { filters_applied: tokens });
  }

  function applyExample(text: string) {
    setNote(text);
    runSearch(text);
  }

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
  }

  function persistNeeds() {
    updateAnswers({
      needs: {
        availability: [],
        language: languageFilter === "any" ? undefined : languageFilter,
        gender: genderFilter === "any" ? undefined : genderFilter,
        note: note.trim() || undefined,
      },
    });
  }

  function continueBooking() {
    if (!selection) return;
    const { match, slot, from, source, rank } = selection;
    persistNeeds();
    updateAnswers({
      selectedClinician: { id: match.clinician.id, name: match.clinician.name },
      selectedSlot: { iso: slot.iso, label: formatInZone(slot.iso, baseInput.state) },
    });
    getTracker()("provider.selected", { from, source, rank, evidence_tier: tierKey(match.evidence) });
    router.push("/cost");
  }

  function changeTimeFilter(value: "any" | AvailabilityWindow) {
    setTimeFilter(value);
    setSelection(null);
    getTracker()("match.filter_changed", { type: "time", value });
  }

  function changeLanguageFilter(value: "any" | LanguageId) {
    setLanguageFilter(value);
    setSelection(null);
    getTracker()("match.filter_changed", { type: "language", value });
  }

  function changeGenderFilter(value: "any" | ClinicianGender) {
    setGenderFilter(value);
    setSelection(null);
    getTracker()("match.filter_changed", { type: "gender", value });
  }

  // Saves the live filters and scroll position, then opens the full clinician
  // page. "Back to matches" restores this exact place (the 37% cliff).
  type OpenSource = "name" | "photo" | "more_times";
  function goToProfile(id: string, from: "card" | "full_list", rank: number, source: OpenSource) {
    persistNeeds();
    updateAnswers({
      matchFilters: {
        time: timeFilter,
        language: languageFilter,
        gender: genderFilter,
        topics: topicFilters,
        cultural: culturalFilter,
        showAll,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      },
    });
    const hash = source === "more_times" ? "#availability" : "";
    router.push(`/clinician/${id}?from=${from}&source=${source}&rank=${rank}${hash}`);
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

  // Returning from a clinician page: restore the saved scroll position once, so
  // the patient lands back where they left off.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const y = saved?.scrollY;
    if (typeof y === "number" && y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Live filter chips: time, language, gender. None can empty the list. */}
      <div className="flex flex-col gap-3">
        <ChipRow label="Time" ariaLabel="Filter by time of day">
          {TIME_CHIPS.map((chip) => (
            <Chip key={chip.id} active={timeFilter === chip.id} onClick={() => changeTimeFilter(chip.id)}>
              {chip.label}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="Language" ariaLabel="Filter by language">
          <Chip active={languageFilter === "any"} onClick={() => changeLanguageFilter("any")}>
            No preference
          </Chip>
          {LANGUAGES.map((l) => (
            <Chip key={l.id} active={languageFilter === l.id} onClick={() => changeLanguageFilter(l.id)}>
              {l.label}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="Gender" ariaLabel="Filter by clinician gender">
          <Chip active={genderFilter === "any"} onClick={() => changeGenderFilter("any")}>
            No preference
          </Chip>
          {CLINICIAN_GENDERS.map((g) => (
            <Chip key={g.id} active={genderFilter === g.id} onClick={() => changeGenderFilter(g.id)}>
              {g.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {/* Search box. The free text is safety-checked (SafeFreeText escalates on its
          own) and kept for the pre-visit summary; a deterministic parse maps
          recognised phrases to the filters above. */}
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <SafeFreeText
          id="match-search"
          label="Describe what you're looking for"
          hint="We'll use this to filter and to help your clinician prepare."
          value={note}
          onChange={setNote}
          step="match"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runSearch(note)}
            className="min-h-11 rounded-full bg-accent px-5 py-2 text-base font-medium text-accent-ink hover:bg-accent-dark"
          >
            Search
          </button>
          <span className="micro text-ink-muted">Prototype: matches on a fixed set of filters.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="micro text-ink-muted">Try</p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => applyExample(ex)}
                className="min-h-11 rounded-full border border-line bg-canvas px-3 py-2 text-left text-sm hover:border-accent"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applied filters, as a removable summary row. */}
      {appliedFilters.length > 0 && (
        <div role="group" aria-label="Applied filters" className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">Filtered by:</span>
          {appliedFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.remove}
              aria-label={`Remove filter ${f.label}`}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-accent bg-accent-soft px-3 py-1 text-sm font-medium"
            >
              {f.label}
              <span aria-hidden className="text-ink-muted">
                ×
              </span>
            </button>
          ))}
          <button type="button" onClick={resetFilters} className="text-sm text-accent underline underline-offset-2">
            Clear all
          </button>
        </div>
      )}

      {searchedNothing && (
        <p role="status" className="text-sm text-ink-muted">
          Showing everyone. Refine with the filters above.
        </p>
      )}

      {noStrong && (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-3">
          We couldn&apos;t find a clinician who fits everything you asked for. Here are the closest options, and you can
          widen your search.
        </p>
      )}

      {tooFew && (
        <p role="status" className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          Only a few clinicians match these filters.
          <button type="button" onClick={resetFilters} className="text-accent underline underline-offset-2">
            Reset filters
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
                state={baseInput.state}
                onPick={(slot) => select(match, slot, "top_match", i + 1, "card")}
                onOpenProfile={(source) => goToProfile(match.clinician.id, "card", i + 1, source)}
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
            {visible.map((match, i) => (
              <li key={match.clinician.id}>
                <ClinicianCard
                  match={match}
                  slots={slotsFor(match)}
                  timeFilter={timeFilter}
                  filler={!match.strong}
                  selectedIso={selection?.match.clinician.id === match.clinician.id ? selection.slot.iso : null}
                  taken={takenFor === match.clinician.id}
                  state={baseInput.state}
                  onPick={(slot) => select(match, slot, "full_list", i + 1, "card")}
                  onOpenProfile={(source) => goToProfile(match.clinician.id, "full_list", i + 1, source)}
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

      <TextLink href="/insurance">Back</TextLink>

      {/* Extra space so the sticky confirm bar never hides the last control. */}
      {selection && <div aria-hidden className="h-40" />}

      {selection && (
        <ConfirmBar
          clinician={selection.match.clinician}
          slotIso={selection.slot.iso}
          estimate={estimateLine(estimate)}
          under48={isWithinCancellationWindow(selection.slot.iso, now) ? under48Line() : null}
          state={baseInput.state}
          onContinue={continueBooking}
        />
      )}
    </Screen>
  );
}

function ClinicianCard({
  match,
  slots,
  timeFilter,
  filler,
  selectedIso,
  taken,
  state,
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
  state: UsState;
  onPick: (slot: Slot) => void;
  onOpenProfile: (source: "name" | "photo" | "more_times") => void;
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
        ? `Next opening: ${formatInZone(slots[0].iso, state)}`
        : null
      : `${TIME_CHIPS.find((c) => c.id === timeFilter)?.label} openings`;
  const planOrLang = facts.payer ? `Takes ${facts.payer}` : facts.language ? `Speaks ${languagePhrase[facts.language]}` : null;
  const reasons = [concernReason, timeReason, planOrLang].filter((r): r is string => Boolean(r)).slice(0, 3);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onOpenProfile("photo")} aria-label={`Open ${clinician.name}'s profile`}>
          <Portrait id={clinician.id} name={clinician.name} size={44} />
        </button>
        <div className="flex flex-col">
          <p className="text-base font-semibold leading-tight">
            <button type="button" onClick={() => onOpenProfile("name")} className="text-left underline-offset-2 hover:underline">
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

      {evLine && (
        <p className="text-xs text-ink-muted">
          {evLine.startsWith("Illustrative:") ? (
            <>
              <span className="micro">Illustrative</span>
              {evLine.slice("Illustrative".length)}
            </>
          ) : (
            evLine
          )}
        </p>
      )}

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
                {formatInZone(slot.iso, state)}
              </button>
            );
          })}
          {!taken && (
            <button type="button" onClick={() => onOpenProfile("more_times")} className="text-sm text-accent underline underline-offset-2">
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
        className={`min-h-11 rounded-md border bg-surface px-3 text-base ${error ? "border-caution" : "border-line"}`}
      />
      <button type="submit" className={`${secondaryClass} self-start`}>
        Email me
      </button>
    </form>
  );
}

/** A labelled row of filter chips. */
function ChipRow({ label, ariaLabel, children }: { label: string; ariaLabel: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="micro text-ink-muted">{label}</p>
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

/** One filter chip. Live filter, never a hard constraint. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 py-2 text-base ${
        active ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
