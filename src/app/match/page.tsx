"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTracker } from "@/analytics/client";
import { trackOnce } from "@/analytics/hooks";
import { cardEvidenceLine, reasonsTemplate } from "@/ai/matchReasons";
import { templateReflection, type ReflectInput, type Reflection } from "@/ai/reflect";
import {
  allRanked,
  cardEvidence,
  displayMatches,
  matchClinicians,
  matchInputFromAnswers,
  widenGains,
  type MatchInput,
  type RankedMatch,
} from "@/clinicians/match";
import type { EvidenceTier } from "@/clinicians/match";
import type { Slot } from "@/clinicians/schedule";
import { concernPhrase, languagePhrase, windowWord } from "@/data/phrases";
import { LoadingScreen, Progress, Screen, TextLink } from "@/components/ui";
import { formatCentral } from "@/time";
import { slotTakenArmed } from "@/devtoggles";
import { samplePayers } from "@/facts";
import { updateAnswers, useAnswers, type SessionAnswers } from "@/session/store";

const tierKey = (e: EvidenceTier) => (e.tier === 3 ? "outcomes" : e.tier === 2 ? "experience" : "declared_fit");

const CLIENT_TIMEOUT_MS = 3000;

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
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  return <MatchView answers={answers} />;
}

function MatchView({ answers }: { answers: SessionAnswers }) {
  const router = useRouter();
  const now = useRef(new Date()).current;
  const baseInput = useMemo(() => matchInputFromAnswers(answers), [answers]);

  // Widen-filter overrides for the no-strong-match state.
  const [relaxed, setRelaxed] = useState<Partial<MatchInput>>({});
  const input: MatchInput = useMemo(() => ({ ...baseInput, ...relaxed }), [baseInput, relaxed]);
  const result = useMemo(() => matchClinicians(input, now), [input, now]);

  const [noneSelected, setNoneSelected] = useState(false);
  const noStrong = result.noStrongMatch || noneSelected;
  const cards = noneSelected ? allRanked(input, now).slice(0, 3) : displayMatches(result);

  const [showAll, setShowAll] = useState(false);
  const [takenFor, setTakenFor] = useState<string | null>(null);
  const consumed = useRef(false);
  const [headline, setHeadline] = useState<Reflection | null>(null);

  // match.viewed once, with the real counts.
  useEffect(() => {
    trackOnce("match.viewed", "match.viewed", { match_count: cards.length, no_strong_match: noStrong });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The model-phrased headline, template on anything slow or failing. Phrases only.
  useEffect(() => {
    let cancelled = false;
    const labels: ReflectInput = {
      step: "match",
      topics: baseInput.topics.map((t) => concernPhrase[t]),
      windows: baseInput.windows.map((w) => windowWord[w]),
      language: baseInput.language ? languagePhrase[baseInput.language] : undefined,
      payer: baseInput.payerId ? samplePayers.value.find((p) => p.id === baseInput.payerId)?.label : undefined,
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

  function choose(match: RankedMatch, slot: Slot, from: "top_match" | "full_list", rank: number) {
    if (slotTakenArmed() && !consumed.current) {
      consumed.current = true;
      setTakenFor(match.clinician.id);
      getTracker()("slot.unavailable_at_booking", { on_step: "match" });
      return;
    }
    updateAnswers({
      selectedClinician: { id: match.clinician.id, name: match.clinician.name },
      selectedSlot: { iso: slot.iso, label: slot.label },
    });
    getTracker()("provider.selected", { from, rank, evidence_tier: tierKey(match.evidence) });
    router.push("/cost");
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

  const strong = noneSelected ? [] : result.strongMatches.slice(0, 3);
  const also = noneSelected ? [] : result.alsoAvailable;
  const fullList = showAll ? allRanked(input, now) : [];

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
        <p className="text-sm text-ink-muted">Written from your answers.</p>
      </div>

      {noStrong && (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-3">
          We couldn&apos;t find a clinician who fits everything you asked for. Here are the closest options, and you can
          widen your search.
        </p>
      )}

      {!showAll && (
        <>
          {noStrong ? (
            <ul className="flex flex-col gap-4">
              {cards.map((match, i) => (
                <li key={match.clinician.id}>
                  <ClinicianCard
                    match={match}
                    filler
                    taken={takenFor === match.clinician.id}
                    onPick={(slot) => choose(match, slot, "top_match", i + 1)}
                    onChooseAnother={() => setTakenFor(null)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {strong.map((match, i) => (
                  <li key={match.clinician.id}>
                    <ClinicianCard
                      match={match}
                      filler={false}
                      taken={takenFor === match.clinician.id}
                      onPick={(slot) => choose(match, slot, "top_match", i + 1)}
                      onChooseAnother={() => setTakenFor(null)}
                    />
                  </li>
                ))}
              </ul>
              {also.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-line pt-4">
                  <p className="text-sm text-ink-muted">
                    Also available. These don&apos;t match everything you asked for, but they have openings.
                  </p>
                  <ul className="flex flex-col gap-4">
                    {also.map((match, i) => (
                      <li key={match.clinician.id}>
                        <ClinicianCard
                          match={match}
                          filler
                          taken={takenFor === match.clinician.id}
                          onPick={(slot) => choose(match, slot, "top_match", strong.length + i + 1)}
                          onChooseAnother={() => setTakenFor(null)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAll && (
        <section aria-label="All clinicians" className="flex flex-col gap-4">
          <p className="text-ink-muted">All clinicians with openings, most relevant first.</p>
          <ul className="flex flex-col gap-4">
            {fullList.map((match, i) => (
              <li key={match.clinician.id}>
                <ClinicianCard
                  match={match}
                  filler={!match.strong}
                  taken={takenFor === match.clinician.id}
                  onPick={(slot) => choose(match, slot, "full_list", i + 1)}
                  onChooseAnother={() => setTakenFor(null)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {noStrong ? (
        <WidenAndHelp
          input={input}
          now={now}
          answers={answers}
          onWiden={(patch) => setRelaxed((r) => ({ ...r, ...patch }))}
        />
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
    </Screen>
  );
}

function ClinicianCard({
  match,
  filler,
  taken,
  onPick,
  onChooseAnother,
}: {
  match: RankedMatch;
  filler: boolean;
  taken: boolean;
  onPick: (slot: Slot) => void;
  onChooseAnother: () => void;
}) {
  const { clinician, facts, slots } = match;
  const reasons = reasonsTemplate(facts);
  const evLine = cardEvidenceLine(cardEvidence(clinician), facts);
  const remaining = taken ? slots.slice(1) : slots.slice(0, 2);

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">
          {clinician.name} {clinician.pronouns && <span className="font-normal text-ink-muted">({clinician.pronouns})</span>}
        </h2>
        <p className="text-sm text-ink-muted">{clinician.credential}</p>
        {filler && <p className="text-sm text-ink-muted">Also available</p>}
      </div>

      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1">
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

      {evLine && <p className="text-sm text-ink-muted">{evLine}</p>}

      {taken && (
        <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm">
          That time was just taken. Nothing holds a slot until you book. Here are the next openings, or you can choose
          another clinician.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Next openings</p>
        {remaining.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {remaining.map((slot) => (
              <button
                key={slot.iso}
                type="button"
                onClick={() => onPick(slot)}
                className="min-h-11 rounded-md border border-accent bg-accent-soft px-4 py-2 text-base font-medium"
              >
                {formatCentral(slot.iso)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-ink-muted">No more openings in the next two weeks.</p>
        )}
        {taken && (
          <button type="button" onClick={onChooseAnother} className="self-start text-accent underline underline-offset-2">
            Choose another clinician
          </button>
        )}
      </div>
    </article>
  );
}

function WidenAndHelp({
  input,
  now,
  answers,
  onWiden,
}: {
  input: MatchInput;
  now: Date;
  answers: SessionAnswers;
  onWiden: (patch: Partial<MatchInput>) => void;
}) {
  const gains = widenGains(input, now);
  return (
    <section aria-label="Widen your search" className="flex flex-col gap-3 border-t border-line pt-4">
      <h2 className="text-lg font-semibold">Widen your search</h2>
      <div className="flex flex-wrap gap-2">
        {input.windows.length > 0 && gains.any_time && (
          <WidenButton label={`Any time of day (+${gains.any_time})`} onClick={() => onWiden({ windows: [] })} />
        )}
        {input.language && gains.any_language && (
          <WidenButton label={`Any language (+${gains.any_language})`} onClick={() => onWiden({ language: undefined })} />
        )}
        {input.gender && gains.any_gender && (
          <WidenButton label={`Any clinician gender (+${gains.any_gender})`} onClick={() => onWiden({ gender: undefined })} />
        )}
      </div>
      <p className="text-ink-muted">
        Prefer to talk to someone?{" "}
        {/* Placeholder contact; see docs/DECISIONS.md. */}
        <a href="mailto:help@example.com" className="text-accent underline underline-offset-2">
          Get help finding care
        </a>
      </p>
      <NotifyMe initialEmail={answers.notifyEmail} />
    </section>
  );
}

function WidenButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-base"
    >
      {label}
    </button>
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
