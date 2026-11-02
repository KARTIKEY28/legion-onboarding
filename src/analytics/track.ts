import {
  EVENTS,
  envelopeSchema,
  type DeviceType,
  type EventEnvelope,
  type EventName,
  type EventProperties,
  type Step,
} from "./schema";

export interface AnalyticsAdapter {
  send(event: EventEnvelope): void;
}

export class InvalidEventError extends Error {
  constructor(name: string, issues: string) {
    super(`Invalid event "${name}": ${issues}`);
    this.name = "InvalidEventError";
  }
}

export interface TrackerOptions {
  sessionId: string;
  deviceType: DeviceType;
  adapter: AnalyticsAdapter;
  now?: () => Date;
  /** "throw" in development and tests so mistakes are loud; "drop" in production. */
  onInvalid?: "throw" | "drop";
}

/** Events with no properties may be called without the second argument. */
type PropsArg<N extends EventName> =
  Record<string, never> extends EventProperties<N>
    ? [properties?: EventProperties<N>]
    : [properties: EventProperties<N>];

export type Track = <N extends EventName>(name: N, ...args: PropsArg<N>) => EventEnvelope | null;

export function createTracker(options: TrackerOptions): Track {
  const { sessionId, deviceType, adapter, now = () => new Date(), onInvalid = "throw" } = options;

  function reject(name: string, issues: string): null {
    const error = new InvalidEventError(name, issues);
    if (onInvalid === "throw") throw error;
    console.warn(error.message);
    return null;
  }

  return function track(name, ...args) {
    const definition = EVENTS[name];
    if (!definition) return reject(name, "not in the event catalog");

    const parsed = definition.properties.safeParse(args[0] ?? {});
    if (!parsed.success) return reject(name, parsed.error.message);

    const properties = parsed.data as Record<string, string | number | boolean>;
    const step = (definition.step ?? properties.on_step) as Step;

    const envelope = envelopeSchema.safeParse({
      event: name,
      session_id: sessionId,
      step,
      device_type: deviceType,
      timestamp: now().toISOString(),
      properties,
    });
    if (!envelope.success) return reject(name, envelope.error.message);

    adapter.send(envelope.data);
    return envelope.data;
  };
}

/** Keeps events in memory: used by tests and by the instrumentation checks. */
export function memoryAdapter(): AnalyticsAdapter & { events: EventEnvelope[] } {
  const events: EventEnvelope[] = [];
  return { events, send: (event) => events.push(event) };
}

export const consoleAdapter: AnalyticsAdapter = {
  send: (event) => console.info("[event]", event.event, event),
};
