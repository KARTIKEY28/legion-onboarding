/**
 * Appointment times are always stored in UTC (an ISO string). They are DISPLAYED
 * in the patient's state's primary zone, because the patient must be in that
 * state during the visit: Texas is Central, Utah is Mountain. The zone and its
 * abbreviation live ONLY here; no component hardcodes a zone (a test enforces it).
 * Note (see docs/DECISIONS.md): El Paso / far-west Texas is actually Mountain, so
 * state-based display is an approximation; production should use the address or
 * browser zone with a confirmation.
 */
export type UsState = "TX" | "UT";

const ZONE: Record<UsState, { tz: string; abbrev: string }> = {
  TX: { tz: "America/Chicago", abbrev: "CT" },
  UT: { tz: "America/Denver", abbrev: "MT" },
};

/** The zone abbreviation for a state ("CT" / "MT"). */
export function zoneAbbrev(state: UsState = "TX"): string {
  return ZONE[state].abbrev;
}

function formatter(state: UsState, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", { timeZone: ZONE[state].tz, ...opts });
}

const DATETIME: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** e.g. "Tue, Nov 10, 2:00 PM CT" (TX) or "... MT" (UT), in the patient's state's zone. */
export function formatInZone(iso: string, state: UsState = "TX"): string {
  try {
    return `${formatter(state, DATETIME).format(new Date(iso))} ${ZONE[state].abbrev}`;
  } catch {
    return iso;
  }
}

/** The calendar day in the state's zone, e.g. "Tue, Nov 10". */
export function dayInZone(iso: string, state: UsState = "TX"): string {
  try {
    return formatter(state, { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** The time of day with the zone, e.g. "2:00 PM CT" (TX) / "... MT" (UT). */
export function timeInZone(iso: string, state: UsState = "TX"): string {
  try {
    return `${formatter(state, { hour: "numeric", minute: "2-digit" }).format(new Date(iso))} ${ZONE[state].abbrev}`;
  } catch {
    return iso;
  }
}

