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

/**
 * A per-clinician start time inside the day-part. The minute is unique per
 * clinician (derived from its id), so no two clinicians ever show the same slot
 * time; the hour shifts by up to an hour for a little variety.
 */
function startTime(clinician: Clinician, window: AvailabilityWindow): { hour: number; minute: number } {
  const n = parseInt(clinician.id.replace(/\D/g, ""), 10) || 0;
  const hourOffset = hash(`${clinician.id}:${window}`) % 2; // 0 or 1
  return { hour: WINDOW_HOUR[window] + hourOffset, minute: (n % 12) * 5 };
}

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

function label(date: Date, hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const mm = minute.toString().padStart(2, "0");
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${h12}:${mm} ${ampm}`;
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
      const { hour, minute } = startTime(clinician, window);
      const at = new Date(date);
      at.setHours(hour, minute, 0, 0);
      slots.push({ iso: at.toISOString(), label: label(at, hour, minute), window });
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
