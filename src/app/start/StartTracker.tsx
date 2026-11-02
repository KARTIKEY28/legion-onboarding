"use client";

import { useEffect } from "react";
import { entrySource } from "@/analytics/entry";
import { trackOnce } from "@/analytics/hooks";
import { startRun } from "@/devtimer";

/** Fires onboarding.started once per session, the denominator for the whole funnel. */
export function StartTracker() {
  useEffect(() => {
    trackOnce("onboarding.started", "onboarding.started", entrySource(new URL(window.location.href), document.referrer));
    startRun();
  }, []);
  return null;
}
