"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTracker } from "@/analytics/client";
import type { Clinician } from "@/clinicians/model";
import { openSlots, type Slot } from "@/clinicians/schedule";
import { CheckOption, SafeFreeText } from "@/components/safety";
import { ProposalLabel } from "@/components/aftervisit";
import { PrimaryButton } from "@/components/ui";
import { dayInZone, timeInZone, type UsState } from "@/time";
import { getAnswers, updateAnswers } from "@/session/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SLOTS = 3;

type ReasonId = "fit" | "medication" | "cost" | "other";
const REASONS: { id: ReasonId; label: string }[] = [
  { id: "fit", label: "Make sure they're right for me" },
  { id: "medication", label: "Ask about medication" },
  { id: "cost", label: "Ask about cost or insurance" },
  { id: "other", label: "Something else" },
];

/**
 * Design proposal: "Request a free intro call". A full-screen sheet on mobile,
 * a centered drawer on desktop. Nothing network-sends; the request is simulated.
 * Rendered as an in-page overlay so the profile stays mounted underneath and the
 * patient returns to the exact same scroll position when they close it.
 */
export function IntroCallSheet({
  clinician,
  state,
  now,
  onClose,
}: {
  clinician: Clinician;
  state: UsState;
  now: Date;
  onClose: () => void;
}) {
  const firstName = clinician.name.split(" ")[0];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openedFired = useRef(false);

  const saved = getAnswers();
  const savedEmail = saved.notifyEmail ?? "";
  const [reasons, setReasons] = useState<ReasonId[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [firstNameField, setFirstNameField] = useState(saved.patient?.firstName ?? "");
  const [lastNameField, setLastNameField] = useState(saved.patient?.lastName ?? "");
  const [email, setEmail] = useState(savedEmail);
  // Edit mode opens automatically when we have no email to show.
  const [editingContact, setEditingContact] = useState(!savedEmail);
  const [emailError, setEmailError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  const days = useMemo(() => groupByDay(openSlots(clinician, now), state), [clinician, now, state]);

  // Lock the page behind the sheet (keeps its scroll position), focus the
  // heading, and let Escape close it. Overflow is restored on unmount.
  useEffect(() => {
    if (!openedFired.current) {
      openedFired.current = true;
      getTracker()("intro_call.opened");
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleReason(id: ReasonId, on: boolean) {
    setReasons((cur) => (on ? [...cur, id] : cur.filter((r) => r !== id)));
  }

  function toggleSlot(iso: string) {
    setSlots((cur) => {
      if (cur.includes(iso)) return cur.filter((s) => s !== iso);
      if (cur.length >= MAX_SLOTS) return cur; // cap at three
      return [...cur, iso];
    });
  }

  const displayName = [firstNameField, lastNameField].filter(Boolean).join(" ");

  function submit() {
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError("That email doesn't look right. Please check it.");
      setEditingContact(true);
      return;
    }
    setEmailError(undefined);
    // Carry the contact forward so nothing is asked twice later.
    updateAnswers({
      notifyEmail: trimmedEmail,
      patient: { ...saved.patient, firstName: firstNameField.trim() || undefined, lastName: lastNameField.trim() || undefined },
    });
    // Simulated: no network request. Analytics carries only the fixed tokens.
    getTracker()("intro_call.requested", { reasons, slots_count: slots.length });
    setSubmitted(true);
    headingRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 md:items-center md:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-call-heading"
        className="flex w-full max-w-xl flex-col gap-5 overflow-y-auto bg-canvas px-4 pt-6 pb-10 md:max-h-[90vh] md:rounded-lg md:shadow-lg"
      >
        {/* Crisis bar stays visible. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="tel:988" className="font-medium underline underline-offset-2">
            Call or text 988
          </a>
          <a href="tel:911" className="text-ink-muted underline underline-offset-2">
            Call 911 if you are in immediate danger
          </a>
        </div>

        <ProposalLabel />

        {submitted ? (
          <Confirmation firstName={firstName} email={email.trim()} headingRef={headingRef} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="intro-call-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
                  Request a free intro call
                </h2>
                <p className="text-ink-muted">A free 15-minute video call with {firstName} before you book.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-2xl leading-none text-ink-muted">
                ×
              </button>
            </div>

            {/* Reasons (multi-select) */}
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">What would you like to cover? (optional)</legend>
              {REASONS.map((r) => (
                <CheckOption key={r.id} label={r.label} checked={reasons.includes(r.id)} onChange={(on) => toggleReason(r.id, on)} />
              ))}
            </fieldset>

            {/* Preferred times: up to three of this clinician's openings. */}
            <section aria-label="Preferred times" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium">Preferred times</h3>
                <p className="text-sm text-ink-muted">Pick up to {MAX_SLOTS} that work for you, in your time zone. {slots.length}/{MAX_SLOTS} chosen.</p>
              </div>
              {days.length === 0 ? (
                <p className="text-ink-muted">No openings in the next two weeks.</p>
              ) : (
                days.map((day) => (
                  <div key={day.label} className="flex flex-col gap-2">
                    <p className="text-sm font-medium">{day.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {day.slots.map((slot) => {
                        const on = slots.includes(slot.iso);
                        const full = !on && slots.length >= MAX_SLOTS;
                        return (
                          <button
                            key={slot.iso}
                            type="button"
                            aria-pressed={on}
                            disabled={full}
                            onClick={() => toggleSlot(slot.iso)}
                            className={`min-h-11 rounded-md border px-4 py-2 text-base font-medium ${
                              on ? "border-accent bg-accent text-accent-ink" : "border-accent bg-accent-soft"
                            } ${full ? "opacity-40" : ""}`}
                          >
                            {timeInZone(slot.iso, state)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Optional note, safety-checked. */}
            <SafeFreeText
              id="intro-call-note"
              label="Anything you'd like them to know? (optional)"
              hint="We'll share this with your clinician to help them prepare."
              value={note}
              onChange={setNote}
              step="match"
            />

            {/* Contact: prefilled and read-only, or collected once if missing. */}
            <section aria-label="Your contact details" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
              <h3 className="font-medium">Where we&apos;ll reply</h3>
              {!editingContact && savedEmail ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col text-sm">
                    {displayName && <span>{displayName}</span>}
                    <span className="text-ink-muted">{email.trim()}</span>
                  </div>
                  <button type="button" onClick={() => setEditingContact(true)} className="shrink-0 text-sm text-accent underline underline-offset-2">
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="intro-first" className="text-sm font-medium">
                      First name
                    </label>
                    <input
                      id="intro-first"
                      autoComplete="given-name"
                      value={firstNameField}
                      onChange={(e) => setFirstNameField(e.target.value)}
                      className="min-h-11 rounded-md border border-line bg-canvas px-3 text-base"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="intro-last" className="text-sm font-medium">
                      Last name
                    </label>
                    <input
                      id="intro-last"
                      autoComplete="family-name"
                      value={lastNameField}
                      onChange={(e) => setLastNameField(e.target.value)}
                      className="min-h-11 rounded-md border border-line bg-canvas px-3 text-base"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="intro-email" className="text-sm font-medium">
                      Email
                    </label>
                    {emailError && (
                      <p id="intro-email-error" className="text-sm text-caution">
                        {emailError}
                      </p>
                    )}
                    <input
                      id="intro-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(undefined);
                      }}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "intro-email-error" : undefined}
                      className={`min-h-11 rounded-md border bg-canvas px-3 text-base ${emailError ? "border-caution" : "border-line"}`}
                    />
                  </div>
                </div>
              )}
            </section>

            <PrimaryButton type="button" onClick={submit} className="w-full">
              Send request
            </PrimaryButton>
            <p className="text-center text-sm text-ink-muted">Prototype: nothing is actually sent.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Confirmation({
  firstName,
  email,
  headingRef,
  onClose,
}: {
  firstName: string;
  email: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="intro-call-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Request sent
        </h2>
        <p role="status">
          {firstName}&apos;s care team will reply to {email} to confirm a time.
        </p>
        <p className="text-sm text-ink-muted">In this prototype, nothing is actually sent.</p>
      </div>
      <PrimaryButton type="button" onClick={onClose} className="w-full">
        Back to {firstName}&apos;s profile
      </PrimaryButton>
    </div>
  );
}

interface DayGroup {
  label: string;
  slots: Slot[];
}

/** Groups openings by the patient's-zone day, chronologically. */
function groupByDay(slots: Slot[], state: UsState): DayGroup[] {
  const byDay = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = dayInZone(slot.iso, state);
    const list = byDay.get(key) ?? [];
    list.push(slot);
    byDay.set(key, list);
  }
  return [...byDay.entries()].map(([label, list]) => ({
    label,
    slots: list.sort((a, b) => a.iso.localeCompare(b.iso)),
  }));
}
