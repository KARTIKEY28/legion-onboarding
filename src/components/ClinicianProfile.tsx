"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { profileExperienceLine, profileOutcomeLine, profileReasons } from "@/ai/matchReasons";
import { evidenceTier, type MatchInput } from "@/clinicians/match";
import type { Clinician } from "@/clinicians/model";
import { profileContent, firstVisitLines } from "@/clinicians/profiles";
import { ROLE_EXPLAINER, roleLabel, sampleCredentials } from "@/clinicians/roles";
import { openSlots, type Slot } from "@/clinicians/schedule";
import { concernPhrase, languagePhrase } from "@/data/phrases";
import { samplePayers } from "@/facts";
import { dayInZone, timeInZone, type UsState } from "@/time";
import { facts as reasonFacts } from "@/clinicians/match";
import { Portrait } from "./Portrait";

const payerLabel = (id: string) => samplePayers.value.find((p) => p.id === id)?.label ?? id;
const STATE_NAME: Record<UsState, string> = { TX: "Texas", UT: "Utah" };

/**
 * The clinician profile: a full-screen sheet on mobile, a side drawer on
 * desktop. Esc and the browser Back button close it (the URL carries
 * ?clinician=id, so it is shareable and restorable). Picking a time here
 * behaves exactly like picking one on the card.
 */
export function ClinicianProfile({
  clinician,
  input,
  now,
  estimate,
  openedFrom,
  onClose,
  onPick,
}: {
  clinician: Clinician;
  input: MatchInput;
  now: Date;
  /** The carried cost estimate line, shown in the profile so cost stays visible. */
  estimate?: string;
  /** What triggered the open; "more_times" scrolls to availability. */
  openedFrom?: "name" | "photo" | "more_times";
  onClose: () => void;
  onPick: (slot: Slot) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLElement>(null);
  const [showRole, setShowRole] = useState(false);
  const firstName = clinician.name.split(" ")[0];
  const content = profileContent(clinician.id);
  const facts = useMemo(() => reasonFacts(clinician, input), [clinician, input]);
  const reasons = profileReasons(facts, firstName);
  const evidence = evidenceTier(clinician);
  const outcomeLine = profileOutcomeLine(evidence);
  const experienceLine = profileExperienceLine(clinician);

  // Availability grouped by the patient's-zone day, chosen windows first within a day.
  const days = useMemo(() => groupByDay(openSlots(clinician, now), input.windows, input.state), [clinician, now, input.windows, input.state]);

  // Opened from "More times": bring availability into view.
  useEffect(() => {
    if (openedFrom === "more_times") {
      const t = setTimeout(() => availabilityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return () => clearTimeout(t);
    }
  }, [openedFrom]);

  // Focus trap + Escape.
  useEffect(() => {
    const panel = panelRef.current;
    panel?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const plans = clinician.acceptedPayers.map(payerLabel);
  const languages = clinician.languages.map((l) => languagePhrase[l]);
  const focusAreas = clinician.specialties.map((id) => concernPhrase[id]);

  return (
    <div className="fixed inset-0 z-50 flex bg-ink/40 sm:justify-end" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${clinician.name}, profile`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-y-auto bg-canvas outline-none sm:max-w-md sm:border-l sm:border-line"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-canvas px-4 py-3">
          <p className="text-sm font-medium text-ink-muted">Clinician profile</p>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-accent underline underline-offset-2">
            Close
          </button>
        </div>

        <div className="flex flex-col gap-6 px-4 py-6">
          {/* 1. Identity */}
          <section className="flex items-start gap-4">
            <Portrait id={clinician.id} name={clinician.name} size={72} />
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-semibold">{clinician.name}</h2>
              {clinician.pronouns && <p className="text-sm text-ink-muted">{clinician.pronouns}</p>}
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {roleLabel[clinician.role]}
                <button
                  type="button"
                  onClick={() => setShowRole((v) => !v)}
                  className="text-accent underline underline-offset-2"
                  aria-expanded={showRole}
                >
                  What&apos;s the difference?
                </button>
              </p>
              <p className="text-sm text-ink-muted">{content.yearsExperience} years of experience</p>
              <p className="text-sm text-ink-muted">Video visits in {STATE_NAME[input.state]}</p>
            </div>
          </section>

          {showRole && (
            <p className="rounded-md bg-accent-soft px-4 py-3 text-sm">{ROLE_EXPLAINER}</p>
          )}

          {/* 2. Why we matched you */}
          {reasons.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Why we matched you</h3>
              <ul className="flex flex-col gap-2">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden className="text-accent">
                      ·
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 3. Carried cost estimate */}
          {estimate && (
            <section className="flex flex-col gap-1 rounded-lg bg-surface p-4">
              <h3 className="text-sm font-medium text-ink-muted">Your estimated cost</h3>
              <p className="text-base">{estimate}</p>
            </section>
          )}

          {/* 4. About me (first-person, distinct per clinician) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">About {firstName}</h3>
            <p>{content.aboutMe}</p>
          </section>

          {/* 5. My approach to care */}
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">My approach to care</h3>
            <p>{content.approach}</p>
          </section>

          {/* 6. What to expect in a first visit */}
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">What to expect in a first visit</h3>
            <ul className="flex flex-col gap-2">
              {firstVisitLines(clinician).map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    ·
                  </span>
                  <span className="text-sm">{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 7. Focus areas and treatment approaches */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Focus areas</h3>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <span key={area} className="rounded-full bg-surface px-3 py-1 text-sm">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-ink-muted">Treatment approaches</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {content.treatmentApproaches.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span aria-hidden className="text-accent">
                      ·
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 8. Languages and plans */}
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Languages and plans</h3>
            <p className="text-sm">
              <span className="text-ink-muted">Languages: </span>
              {languages.join(", ")}
            </p>
            <p className="text-sm">
              <span className="text-ink-muted">Plans accepted: </span>
              {plans.join(", ")}, and self pay
            </p>
          </section>

          {/* 6. Training and licensing */}
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Training and licensing</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {sampleCredentials(clinician.role).map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted">Sample details for this prototype.</p>
          </section>

          {/* 7. Evidence */}
          {(outcomeLine || experienceLine) && (
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Experience</h3>
              {experienceLine && <p className="text-sm text-ink-muted">{experienceLine}</p>}
              {outcomeLine && <p className="text-sm text-ink-muted">{outcomeLine}</p>}
            </section>
          )}

          {/* 11. Full availability */}
          <section ref={availabilityRef} id="profile-availability" className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Availability (next 2 weeks)</h3>
            {days.length === 0 ? (
              <p className="text-ink-muted">No openings in the next two weeks.</p>
            ) : (
              days.map((day) => (
                <div key={day.label} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{day.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => onPick(slot)}
                        className="min-h-11 rounded-md border border-accent bg-accent-soft px-4 py-2 text-base font-medium"
                      >
                        {timeInZone(slot.iso, input.state)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

interface DayGroup {
  label: string;
  slots: Slot[];
}

/** Groups slots by the patient's-zone day in chronological order; chosen windows first within a day. */
function groupByDay(slots: Slot[], windows: MatchInput["windows"], state: MatchInput["state"]): DayGroup[] {
  const chosen = new Set(windows);
  const rank = (w: Slot["window"]) => (chosen.size && chosen.has(w) ? 0 : 1);
  const byDay = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = dayInZone(slot.iso, state);
    const list = byDay.get(key) ?? [];
    list.push(slot);
    byDay.set(key, list);
  }
  return [...byDay.entries()].map(([label, list]) => ({
    label,
    slots: list.sort((a, b) => rank(a.window) - rank(b.window) || a.iso.localeCompare(b.iso)),
  }));
}
