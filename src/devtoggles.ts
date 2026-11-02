"use client";

/**
 * Dev/demo toggle: simulate the chosen slot being taken at the moment of
 * booking. Nothing holds a slot on the server, so this can really happen.
 * Arm it by setting a cookie, e.g. in the console:
 *   document.cookie = "dev_slot_taken=1";
 * The Match page consumes it once per session so a retry can succeed.
 */
export function slotTakenArmed(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return /(?:^|;\s*)dev_slot_taken=1(?:;|$)/.test(document.cookie);
  } catch {
    return false;
  }
}
