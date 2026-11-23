"use client";

import type { Clinician } from "@/clinicians/model";
import { formatInZone, type UsState } from "@/time";
import { Portrait } from "./Portrait";

const DEV_LABEL = process.env.NEXT_PUBLIC_SHOW_DEV_LABEL === "1";

/**
 * The sticky confirm bar shown once a time is selected, on the Match list and on
 * the clinician page. Selecting a time anywhere shows the same bar; Continue
 * books nothing yet, it carries the choice to Cost and terms.
 */
export function ConfirmBar({
  clinician,
  slotIso,
  estimate,
  under48,
  state,
  onContinue,
}: {
  clinician: Clinician;
  slotIso: string;
  estimate: string;
  under48: string | null;
  state: UsState;
  onContinue: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur"
      style={{ bottom: DEV_LABEL ? 52 : 0 }}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        <Portrait id={clinician.id} name={clinician.name} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">
            {clinician.name} · {formatInZone(slotIso, state)}
          </p>
          <p className="truncate text-xs text-ink-muted">{estimate}</p>
          {under48 && <p className="truncate text-xs font-medium text-ink">{under48}</p>}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-11 shrink-0 rounded-full bg-accent px-6 py-2 text-base font-medium text-accent-ink hover:bg-accent-dark"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
