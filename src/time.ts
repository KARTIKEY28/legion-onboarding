/**
 * Legion schedules in Central Time, so every booked date and time is shown in
 * America/Chicago regardless of the viewer's own timezone. Using Intl with an
 * explicit timeZone keeps this deterministic across machines and in tests.
 */
const CENTRAL = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const CENTRAL_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const CENTRAL_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
});

/** e.g. "Tue, Nov 10, 2:00 PM CT". Falls back to the raw value if unparseable. */
export function formatCentral(iso: string): string {
  try {
    return `${CENTRAL.format(new Date(iso))} CT`;
  } catch {
    return iso;
  }
}

/** The Central-Time calendar day, e.g. "Tue, Nov 10". Used to group availability. */
export function centralDay(iso: string): string {
  try {
    return CENTRAL_DAY.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** The Central-Time time of day with the zone, e.g. "2:00 PM CT". */
export function centralTime(iso: string): string {
  try {
    return `${CENTRAL_TIME.format(new Date(iso))} CT`;
  } catch {
    return iso;
  }
}
