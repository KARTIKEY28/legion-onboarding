/**
 * Draft clinician model for the match (slice 5). The Needs screen may only ask
 * about attributes that exist here, so every preference can actually be used.
 * Illustrative data will be added in slice 5 and labeled as such.
 */
import type { TopicId } from "@/facts";
import type { UsState } from "@/time";

export const AVAILABILITY_WINDOWS = [
  { id: "weekday_mornings", label: "Weekday mornings" },
  { id: "weekday_afternoons", label: "Weekday afternoons" },
  { id: "weekday_evenings", label: "Weekday evenings" },
  { id: "weekends", label: "Weekends" },
] as const;
export type AvailabilityWindow = (typeof AVAILABILITY_WINDOWS)[number]["id"];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const CLINICIAN_GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "nonbinary", label: "Nonbinary" },
] as const;
export type ClinicianGender = (typeof CLINICIAN_GENDERS)[number]["id"];

/** The two clinician roles in the prototype, for the "what's the difference?" explainer. */
export const CLINICIAN_ROLES = ["psychiatrist", "pmhnp"] as const;
export type ClinicianRole = (typeof CLINICIAN_ROLES)[number];

export interface Clinician {
  id: string;
  /** Shown on the match card. */
  name: string;
  pronouns?: string;
  /** A plain credential line, e.g. "Psychiatric nurse practitioner". */
  credential: string;
  /** The role, as an id, for the role explainer. */
  role: ClinicianRole;
  /** States the clinician is licensed in. A patient only matches clinicians licensed in their state. */
  licensedStates: UsState[];
  photoUrl?: string;
  /** Declared fit (evidence tier 1): topics the clinician says they focus on. */
  specialties: TopicId[];
  languages: LanguageId[];
  gender: ClinicianGender;
  availability: AvailabilityWindow[];
  /** Synthetic plan ids (from samplePayers) this clinician accepts. All accept self pay. */
  acceptedPayers: string[];
  /** A short first-person line, shown as written by the clinician. */
  bio: string;
  /** Evidence tiers 2 and 3. Always labeled illustrative in the prototype. */
  experience?: { similarPatients: number; illustrative: true };
  outcomes?: { measure: string; cohortSize: number; improvedShare: number; illustrative: true };
  /** Synthetic edge case: no open slots in the next 14 days, so never a strong match. */
  fullyBooked?: boolean;
}

/** Outcomes (evidence tier 3) appear only in the profile, and only when the cohort is at least this large. */
export const MIN_OUTCOME_COHORT = 50;
