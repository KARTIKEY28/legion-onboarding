/**
 * Draft clinician model for the match (slice 5). The Needs screen may only ask
 * about attributes that exist here, so every preference can actually be used.
 * Illustrative data will be added in slice 5 and labeled as such.
 */
import type { TopicId } from "@/facts";

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

export interface Clinician {
  id: string;
  /** Shown on the match card. */
  name: string;
  pronouns?: string;
  /** A plain credential line, e.g. "Psychiatric nurse practitioner". */
  credential: string;
  photoUrl?: string;
  /** Declared fit (evidence tier 1): topics the clinician says they focus on. */
  specialties: TopicId[];
  languages: LanguageId[];
  gender: ClinicianGender;
  availability: AvailabilityWindow[];
  /** A short first-person line, shown as written by the clinician. */
  bio: string;
  /** Evidence tiers 2 and 3. Always labeled illustrative in the prototype. */
  experience?: { similarPatients: number; illustrative: true };
  outcomes?: { measure: string; cohortSize: number; improvedShare: number; illustrative: true };
}
