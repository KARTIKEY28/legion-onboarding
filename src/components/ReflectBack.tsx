"use client";

import { useEffect, useState } from "react";
import { trackOnce } from "@/analytics/hooks";
import { templateReflection, type ReflectInput, type Reflection } from "@/ai/reflect";
import { getAnswers, updateAnswers } from "@/session/store";

const CLIENT_TIMEOUT_MS = 3000;

async function fetchReflection(input: ReflectInput): Promise<Reflection> {
  const template: Reflection = { text: templateReflection(input), source: "template" };
  if (!navigator.onLine) return template;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/reflect-back", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) return template;
    const result = (await response.json()) as Reflection;
    return result.text ? result : template;
  } catch {
    return template;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One short line reflecting the patient's own answers (AI feature 2).
 * It loads alongside the screen and never holds up navigation; if the model
 * is slow, offline or fails, the template line appears instead.
 */
export function ReflectBack({ input }: { input: ReflectInput }) {
  const key = `${input.step}:${JSON.stringify(input)}`;
  const [reflection, setReflection] = useState<Reflection | null>(() => getAnswers().reflections?.[key] ?? null);

  useEffect(() => {
    let cancelled = false;
    const cached = getAnswers().reflections?.[key];
    const show = (result: Reflection) => {
      if (cancelled) return;
      setReflection(result);
      trackOnce(`reflect_back.shown:${input.step}`, "reflect_back.shown", { source: result.source, on_step: input.step });
    };
    if (cached) {
      show(cached);
    } else {
      fetchReflection(input).then((result) => {
        updateAnswers({ reflections: { ...getAnswers().reflections, [key]: result } });
        show(result);
      });
    }
    return () => {
      cancelled = true;
    };
    // The key captures the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <figure aria-busy={!reflection} className="flex flex-col gap-1 border-l-2 border-accent py-1 pl-4">
      {reflection ? (
        <blockquote className="text-lg" data-source={reflection.source} data-testid="reflect-back">
          {reflection.text}
        </blockquote>
      ) : (
        <span className="block h-6 w-3/4 animate-pulse rounded-md bg-line" aria-label="Writing a short summary of your answers" />
      )}
      <figcaption className="text-sm text-ink-muted">Written from your answers</figcaption>
    </figure>
  );
}
