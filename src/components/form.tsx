"use client";

import type { ReactNode } from "react";
import { eligibility } from "@/facts";

interface Option<V extends string> {
  value: V;
  label: string;
}

/** A labeled question with an optional one-line reason, note and calm error text. */
export function RadioQuestion<V extends string>({
  id,
  legend,
  hideLegend,
  reason,
  help,
  options,
  value,
  onChange,
  error,
  note,
}: {
  id: string;
  legend: string;
  /** Visually hides the legend (kept for screen readers) when the heading already names the question. */
  hideLegend?: boolean;
  reason?: string;
  help?: ReactNode;
  options: Option<V>[];
  value: V | undefined;
  onChange: (value: V) => void;
  error?: string;
  note?: ReactNode;
}) {
  const describedBy = [reason && `${id}-reason`, help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <fieldset id={id} aria-describedby={describedBy || undefined} className="flex flex-col gap-3" tabIndex={-1}>
      <legend className={hideLegend ? "sr-only" : "mb-1 text-lg font-semibold"}>{legend}</legend>
      {reason && (
        <p id={`${id}-reason`} className="text-ink-muted">
          {reason}
        </p>
      )}
      {help && (
        <p id={`${id}-help`} className="text-sm text-ink-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caution">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-2 ${
              value === option.value ? "border-accent" : "border-line"
            }`}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-accent"
            />
            {option.label}
          </label>
        ))}
      </div>
      {note}
    </fieldset>
  );
}

export interface DobFields {
  month: string;
  day: string;
  year: string;
}

/** Formats raw keystrokes as MM/DD/YYYY, inserting slashes as digits arrive. */
export function maskDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter((part, i) => i === 0 || digits.length > i * 2)
    .join("/");
}

/** Splits a MM/DD/YYYY string back into the parse shape. */
export function splitMaskedDob(masked: string): DobFields {
  const [month = "", day = "", year = ""] = masked.split("/");
  return { month, day, year };
}

/** Formats a stored DobFields as MM/DD/YYYY for prefilling the masked field. */
export function maskedFromFields(fields: DobFields): string {
  const pad = (v: string, n: number) => (v ? v.padStart(n, "0") : "");
  return maskDob([pad(fields.month, 2), pad(fields.day, 2), pad(fields.year, 4)].join(""));
}

/** Date of birth as one masked MM/DD/YYYY field. The raw date never leaves the client in events. */
export function DobQuestion({
  value,
  onChange,
  onBlur,
  error,
  note,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="dob" className="text-lg font-semibold">
        Date of birth
      </label>
      <p id="dob-reason" className="text-ink-muted">
        We only use it to confirm you&apos;re {eligibility.minimumAge.value} or older, since Legion sees adults. We need
        it to continue.
      </p>
      {error && (
        <p id="dob-error" className="text-caution">
          {error}
        </p>
      )}
      <input
        id="dob"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="MM/DD/YYYY"
        maxLength={10}
        value={value}
        onChange={(e) => onChange(maskDob(e.target.value))}
        onBlur={onBlur}
        aria-describedby={`dob-reason${error ? " dob-error" : ""}`}
        aria-invalid={Boolean(error)}
        className={`min-h-11 w-44 rounded-md border bg-surface px-3 text-base text-ink ${
          error ? "border-caution" : "border-line"
        }`}
      />
      {note}
    </div>
  );
}

/** A compact toggle chip for a multi-select list (e.g. Conditions topics). */
export function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`min-h-11 rounded-full border px-4 py-2 text-left text-base ${
        selected ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

/** A calm note shown the moment an answer means Legion can't see the patient. */
export function ExclusionNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md bg-accent-soft px-4 py-3 text-ink">
      {children}
    </p>
  );
}
