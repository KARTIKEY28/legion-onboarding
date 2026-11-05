import type { PrevisitInput } from "@/ai/previsit";
import { AVAILABILITY_WINDOWS, CLINICIAN_GENDERS, LANGUAGES } from "@/clinicians/model";
import { conditionTopics } from "@/facts";
import type { SessionAnswers } from "@/session/store";
import type { DEMO_DEFAULTS } from "@/components/aftervisit";
import type { VisitContext } from "./content";

/** Maps the patient's stored answers to the labels and shapes the slice-7 screens use. */

export function topicLabels(a: SessionAnswers): string[] {
  const ids = a.conditions?.topics ?? [];
  return ids.map((id) => conditionTopics.value.find((t) => t.id === id)?.label ?? id);
}

export function availabilityLabels(a: SessionAnswers): string[] {
  const ids = a.needs?.availability ?? [];
  return ids.map((id) => AVAILABILITY_WINDOWS.find((w) => w.id === id)?.label ?? id);
}

function languageLabel(a: SessionAnswers): string | undefined {
  const id = a.needs?.language;
  return id ? (LANGUAGES.find((l) => l.id === id)?.label ?? id) : undefined;
}

function genderLabel(a: SessionAnswers): string | undefined {
  const id = a.needs?.gender;
  return id ? (CLINICIAN_GENDERS.find((g) => g.id === id)?.label ?? id) : undefined;
}

export function previsitInput(a: SessionAnswers): PrevisitInput {
  return {
    topics: topicLabels(a),
    availability: availabilityLabels(a),
    language: languageLabel(a),
    genderPref: genderLabel(a),
    path: a.insurance?.path ?? "not_sure",
  };
}

/** The visit context for content helpers, or null until a visit is booked. */
export function visitContext(a: SessionAnswers, demo: typeof DEMO_DEFAULTS): VisitContext | null {
  if (!a.selectedClinician || !a.selectedSlot) return null;
  return {
    clinicianName: a.selectedClinician.name,
    slotIso: a.selectedSlot.iso,
    formsComplete: demo.formsComplete,
    path: a.insurance?.path ?? "not_sure",
    insuranceState: demo.insuranceState,
  };
}
