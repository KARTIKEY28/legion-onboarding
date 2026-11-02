"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { crisisResources } from "@/facts";
import { localSafetyCheck } from "@/safety/local";

type SafetyStep = "conditions" | "safety" | "needs";

const CRISIS_CHAT_URL = "https://988lifeline.org/chat/";

/**
 * The expanded crisis panel. Warm, immediate, and never in the way:
 * the screen's Continue button stays available below it.
 */
export const CrisisPanel = forwardRef<HTMLElement, { variant?: "concern" | "gentle" }>(function CrisisPanel(
  { variant = "concern" },
  ref,
) {
  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-labelledby="crisis-panel-heading"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft p-4"
    >
      <h2 id="crisis-panel-heading" className="text-lg font-semibold">
        {variant === "concern" ? "Thank you for telling us. You don't have to wait to talk to someone." : "If things feel hard right now, help is here."}
      </h2>
      <p>Trained counselors are available any time. It&apos;s free and confidential.</p>
      <ul className="flex flex-col gap-2">
        {crisisResources.map((resource) => (
          <li key={resource.id}>
            <a href={resource.href} className="font-medium underline underline-offset-2">
              {resource.action}
            </a>{" "}
            <span className="text-ink-muted">· {resource.label}</span>
          </li>
        ))}
        <li>
          <a href={CRISIS_CHAT_URL} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
            Chat with a person at 988 online
          </a>
        </li>
      </ul>
      <p className="text-ink-muted">You can keep going here whenever you&apos;re ready. Nothing you shared stops you from continuing.</p>
    </section>
  );
});

/**
 * Checks free text for crisis language. The local check runs first and always
 * wins; the model may only escalate, after a pause in typing. Once escalated,
 * it stays escalated for this screen: nothing downgrades it.
 */
export function useSafetyCheck(text: string, step: SafetyStep) {
  const [escalated, setEscalated] = useState(false);
  const requestId = useRef(0);

  const local = localSafetyCheck(text).concern;

  useEffect(() => {
    if (local) {
      setEscalated(true);
      trackOnce(`safety.escalated:${step}:local`, "safety.escalated", { source: "local", on_step: step });
      return;
    }
    if (escalated || text.trim().length < 3) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/safety-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const result = (await response.json()) as { escalate?: boolean; source?: string };
        if (id === requestId.current && result.escalate) {
          setEscalated(true);
          trackOnce(`safety.escalated:${step}:model`, "safety.escalated", {
            source: result.source === "local" ? "local" : "model",
            on_step: step,
          });
        }
      } catch {
        // Model unavailable: the local check already ran, so nothing changes.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [text, local, escalated, step]);

  return { escalated: escalated || local, local };
}

/** A labeled optional free-text box with the safety check built in. */
export function SafeFreeText({
  id,
  label,
  hint,
  value,
  onChange,
  step,
  onEscalate,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  step: SafetyStep;
  onEscalate?: (escalated: boolean) => void;
}) {
  const { escalated } = useSafetyCheck(value, step);
  useEffect(() => {
    onEscalate?.(escalated);
  }, [escalated, onEscalate]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-sm text-ink-muted">
        {hint}
      </p>
      <textarea
        id={id}
        rows={4}
        maxLength={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint`}
        className="rounded-md border border-line bg-surface px-3 py-2 text-base"
      />
      {escalated && <CrisisPanel />}
    </div>
  );
}

/** A checkbox styled like the radio options. */
export function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-2 ${
        checked ? "border-accent" : "border-line"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
      {label}
    </label>
  );
}
