"use client";

import type { DeviceType } from "./schema";
import { consoleAdapter, createTracker, memoryAdapter, type AnalyticsAdapter, type Track } from "./track";

const SESSION_KEY = "legion.session_id";

/** One id per browser tab session. Falls back to an in-memory id when storage is blocked. */
export function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function getDeviceType(width = window.innerWidth): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Every event is also kept on `window.__legionEvents` so instrumentation can be checked in the browser. */
const debugAdapter = memoryAdapter();

declare global {
  interface Window {
    __legionEvents?: typeof debugAdapter.events;
  }
}

let tracker: Track | null = null;

export function getTracker(): Track {
  if (tracker) return tracker;
  window.__legionEvents = debugAdapter.events;
  const adapters: AnalyticsAdapter[] = [debugAdapter];
  if (process.env.NODE_ENV !== "production") adapters.push(consoleAdapter);
  tracker = createTracker({
    sessionId: getSessionId(),
    deviceType: getDeviceType(),
    adapter: { send: (event) => adapters.forEach((adapter) => adapter.send(event)) },
    onInvalid: process.env.NODE_ENV === "production" ? "drop" : "throw",
  });
  return tracker;
}
