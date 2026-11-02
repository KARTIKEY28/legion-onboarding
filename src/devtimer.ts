"use client";

/**
 * Dev-only timer for how long a full onboarding run takes, so the Start screen's
 * "a few minutes" estimate can be replaced with a real number after a few timed
 * runs. Active only when the dev label is on (NEXT_PUBLIC_SHOW_DEV_LABEL=1);
 * it never runs for patients and writes nothing to analytics.
 */
const KEY = "legion.runStartedAt";
const active = () => process.env.NEXT_PUBLIC_SHOW_DEV_LABEL === "1";

export function startRun(): void {
  if (!active()) return;
  try {
    if (!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // storage blocked; skip timing
  }
}

export function endRun(label: string): void {
  if (!active()) return;
  try {
    const started = sessionStorage.getItem(KEY);
    if (started) console.info(`[dev timer] reached ${label} in ${((Date.now() - Number(started)) / 1000).toFixed(1)}s from Start`);
  } catch {
    // storage blocked; skip timing
  }
}
