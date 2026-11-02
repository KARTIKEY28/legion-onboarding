import type { AvailabilityWindow, Clinician } from "./model";

/**
 * Synthetic open-slot schedule for the next 14 days. Deterministic from the
 * clinician id and the date, so the demo is stable and testable. A clinician
 * marked fullyBooked has no slots. Nothing here is a real calendar.
 */

export interface Slot {
  /** ISO datetime of the slot. */
  iso: string;
  /** Human label, e.g. "Tue, Nov 4, 9:00 AM". */
  label: string;
  window: AvailabilityWindow;
}

const WINDOW_HOUR: Record<AvailabilityWindow, number> = {
  weekday_mornings: 9,
  weekday_afternoons: 14,
  weekday_evenings: 18,
  weekends: 11,
};

function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}

function windowForDay(window: AvailabilityWindow, day: number): boolean {
  return window === "weekends" ? isWeekend(day) : !isWeekend(day);
}

/** Small deterministic hash so "openings" are stable but look varied. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(date: Date, hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${h12}:00 ${ampm}`;
}

/**
 * All open slots for a clinician over the next 14 days from `now`.
 * Restricted to `windows` when given (the patient's chosen times), else any.
 */
export function openSlots(clinician: Clinician, now: Date, windows?: AvailabilityWindow[]): Slot[] {
  if (clinician.fullyBooked) return [];
  const want = windows && windows.length ? new Set(windows) : null;
  const slots: Slot[] = [];
  for (let offset = 1; offset <= 14; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const day = date.getDay();
    for (const window of clinician.availability) {
      if (want && !want.has(window)) continue;
      if (!windowForDay(window, day)) continue;
      // Open about two days out of three, deterministically.
      if (hash(`${clinician.id}:${offset}:${window}`) % 3 === 0) continue;
      const hour = WINDOW_HOUR[window];
      const at = new Date(date);
      at.setHours(hour, 0, 0, 0);
      slots.push({ iso: at.toISOString(), label: label(at, hour), window });
    }
  }
  return slots.sort((a, b) => a.iso.localeCompare(b.iso));
}

/** The next few open times, soonest first. */
export function nextSlots(clinician: Clinician, now: Date, windows: AvailabilityWindow[] | undefined, count = 3): Slot[] {
  return openSlots(clinician, now, windows).slice(0, count);
}

export function hasOpening(clinician: Clinician, now: Date, windows?: AvailabilityWindow[]): boolean {
  return openSlots(clinician, now, windows).length > 0;
}
