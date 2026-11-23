import type { ReactNode } from "react";
import { Portrait } from "./Portrait";

/**
 * The booked-visit summary card, shared by Cost, Account, Payment and
 * Confirmation so they read identically: a soft-accent card with the clinician
 * portrait, an eyebrow, the name and (optionally) the role. Each screen passes
 * its own details (time, cost, actions) as `children` in the text column, and
 * anything full-width (e.g. a terms line) as `footer`.
 */
export function VisitSummary({
  label,
  eyebrow = "Video visit",
  clinicianId,
  clinicianName,
  role,
  children,
  footer,
}: {
  label: string;
  eyebrow?: string;
  clinicianId?: string;
  clinicianName?: string;
  role?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2 rounded-lg bg-accent-soft p-4">
      <div className="flex items-start gap-3">
        {clinicianId && <Portrait id={clinicianId} name={clinicianName ?? "your clinician"} size={48} />}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-muted">{eyebrow}</p>
          <p className="text-lg font-semibold">{clinicianName ?? "Your clinician"}</p>
          {role && <p className="text-sm text-ink-muted">{role}</p>}
          {children}
        </div>
      </div>
      {footer}
    </section>
  );
}
