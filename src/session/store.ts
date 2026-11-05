"use client";

import { useSyncExternalStore } from "react";
import type { CostSummary } from "@/ai/cost";
import type { AvailabilityWindow, ClinicianGender, LanguageId } from "@/clinicians/model";
import type { CoverageAnswer, Criterion, YesNo } from "@/eligibility";
import type { TopicId } from "@/facts";

export type SafetyAnswer = "yes" | "no" | "rather_not_say";

/**
 * The patient's answers for this browser tab, kept in sessionStorage so back
 * and refresh work and nobody is asked twice. Nothing here is ever sent in an
 * analytics event; events carry only pass, fail or counts.
 */
export interface SessionAnswers {
  inTexas?: YesNo;
  /** Raw fields, kept only to prefill the form. Never logged. */
  dob?: { day: string; month: string; year: string };
  coverage?: CoverageAnswer;
  /** Set when coverage is "not sure"; the Insurance step confirms it. */
  confirmCoverageAtInsurance?: boolean;
  /** Criteria that stopped the patient, shown on the next-steps screen. */
  exclusions?: Criterion[];
  conditions?: {
    topics: TopicId[];
    unsure: boolean;
    skipped: boolean;
    /** Kept only to prefill and for the reflect-back line. Never logged. */
    freeText?: string;
  };
  /** Safety answers. Recorded only; they never decide eligibility (open question for Legion). */
  safety?: {
    recentThoughts?: SafetyAnswer;
    hospitalized?: SafetyAnswer;
  };
  needs?: {
    availability: AvailabilityWindow[];
    language?: LanguageId;
    gender?: ClinicianGender;
    /** Kept only to prefill and for the reflect-back line. Never logged. */
    note?: string;
  };
  insurance?: {
    path: "insured" | "self_pay" | "not_sure";
    /** Kept only to prefill and for verification later. Never logged. */
    payerId?: string;
    payerOther?: string;
    memberId?: string;
    groupId?: string;
    /** The patient chose to add insurance details later (open question for Legion). */
    addLater?: boolean;
  };
  /** The answer when "not sure" about Medicare or Medicaid was asked again on Insurance. */
  coverageAtInsurance?: "yes" | "no" | "unsure";
  /** The clinician the patient picked on Match. */
  selectedClinician?: { id: string; name: string };
  /** The time the patient picked. iso is the slot; label is for display. */
  selectedSlot?: { iso: string; label: string };
  /** Cost summaries already written, by insurance path. */
  costSummaries?: Partial<Record<"insured" | "self_pay" | "not_sure", CostSummary>>;
  /** Reflect-back lines already written, keyed by step and answers, so back and refresh don't refetch. */
  reflections?: Record<string, { text: string; source: "model" | "template" }>;
  /** From a notify-me form; pre-filled at the account step. */
  notifyEmail?: string;
  /** Whether this email already had an account (returning patient at account creation). */
  returningPatient?: boolean;
  /** Set once the visit is booked on the Payment step. */
  booked?: boolean;
  /** Slice-7 demo controls (dev only): simulated time, insurance status, forms and visit state. */
  demo?: {
    clock?: "far" | "48h" | "24h" | "1h" | "visit";
    insuranceState?: "checking" | "confirmed" | "more_info";
    formsComplete?: boolean;
    visitComplete?: boolean;
  };
  /** Keys of events already fired this session, so each fires once. */
  fired?: string[];
}

const KEY = "legion.answers";
const EMPTY: SessionAnswers = {};

let cache: SessionAnswers | null = null;
let memoryFallback: SessionAnswers = EMPTY;
const listeners = new Set<() => void>();

function read(): SessionAnswers {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as SessionAnswers) : EMPTY;
  } catch {
    cache = memoryFallback;
  }
  return cache;
}

export function getAnswers(): SessionAnswers {
  return read();
}

export function updateAnswers(patch: Partial<SessionAnswers>): SessionAnswers {
  const next = { ...read(), ...patch };
  cache = next;
  memoryFallback = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: keep answers in memory for this page view.
  }
  listeners.forEach((listener) => listener());
  return next;
}

/** Records a key once per session. Returns true the first time. */
export function markOnce(key: string): boolean {
  const fired = read().fired ?? [];
  if (fired.includes(key)) return false;
  updateAnswers({ fired: [...fired, key] });
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Answers, or null before the browser has loaded them (render a loading state then). */
export function useAnswers(): SessionAnswers | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
