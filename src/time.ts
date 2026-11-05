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

/** e.g. "Tue, Nov 10, 2:00 PM CT". Falls back to the raw value if unparseable. */
export function formatCentral(iso: string): string {
  try {
    return `${CENTRAL.format(new Date(iso))} CT`;
  } catch {
    return iso;
  }
}
