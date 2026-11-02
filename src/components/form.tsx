"use client";

import type { ReactNode } from "react";
import { eligibility } from "@/facts";

interface Option<V extends string> {
  value: V;
  label: string;
}

/** A labeled question with one-line reason, an optional note and calm error text. */
export function RadioQuestion<V extends string>({
  id,
  legend,
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
  reason: string;
  help?: ReactNode;
  options: Option<V>[];
  value: V | undefined;
  onChange: (value: V) => void;
  error?: string;
  note?: ReactNode;
}) {
  const describedBy = [`${id}-reason`, help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <fieldset id={id} aria-describedby={describedBy} className="flex flex-col gap-3" tabIndex={-1}>
      <legend className="mb-1 text-lg font-semibold">{legend}</legend>
      <p id={`${id}-reason`} className="text-ink-muted">
        {reason}
      </p>
      {help && (
        <p id={`${id}-help`} className="text-sm text-ink-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-3 ${
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

/** Date of birth as three numeric fields: easier on phones than a date picker for birth dates. */
export function DobQuestion({
  value,
  onChange,
  onBlur,
  error,
  note,
}: {
  value: DobFields;
  onChange: (value: DobFields) => void;
  onBlur: () => void;
  error?: string;
  note?: ReactNode;
}) {
  const fields: { key: keyof DobFields; label: string; width: string; max: number; autoComplete: string }[] = [
    { key: "month", label: "Month", width: "w-16", max: 2, autoComplete: "bday-month" },
    { key: "day", label: "Day", width: "w-16", max: 2, autoComplete: "bday-day" },
    { key: "year", label: "Year", width: "w-24", max: 4, autoComplete: "bday-year" },
  ];
  return (
    <fieldset
      id="dob"
      aria-describedby={`dob-reason${error ? " dob-error" : ""}`}
      className="flex flex-col gap-3"
      tabIndex={-1}
    >
      <legend className="mb-1 text-lg font-semibold">Date of birth</legend>
      <p id="dob-reason" className="text-ink-muted">
        We only use it to confirm you&apos;re {eligibility.minimumAge.value} or older, since Legion sees
        adults. We need it to continue.
      </p>
      {error && (
        <p id="dob-error" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-sm text-ink-muted">
            {field.label}
            <input
              inputMode="numeric"
              autoComplete={field.autoComplete}
              maxLength={field.max}
              value={value[field.key]}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value.replace(/\D/g, "") })}
              onBlur={onBlur}
              aria-invalid={Boolean(error)}
              className={`${field.width} min-h-12 rounded-md border bg-surface px-3 text-base text-ink ${
                error ? "border-danger" : "border-line"
              }`}
            />
          </label>
        ))}
      </div>
      {note}
    </fieldset>
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
