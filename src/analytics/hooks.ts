"use client";

import { useEffect, useRef } from "react";
import { markOnce } from "@/session/store";
import { getTracker } from "./client";
import type { EventName, EventProperties } from "./schema";

/** Fires an event once per session for a given key (e.g. a step's viewed event). */
export function trackOnce<N extends EventName>(key: string, name: N, properties?: EventProperties<N>) {
  if (!markOnce(key)) return;
  const track = getTracker() as (name: N, properties?: EventProperties<N>) => unknown;
  track(name, properties);
}

/** Fires an event once per session when the screen first shows. */
export function useTrackOnce<N extends EventName>(key: string, name: N, properties?: () => EventProperties<N>) {
  const props = useRef(properties);
  useEffect(() => {
    trackOnce(key, name, props.current?.());
  }, [key, name]);
}
