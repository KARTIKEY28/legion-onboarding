"use client";

import { topicLabels, visitContext } from "@/aftervisit/answers";
import { previsitEmails } from "@/aftervisit/content";
import { AfterVisitScreen, useDemo } from "@/components/aftervisit";
import { LoadingScreen } from "@/components/ui";
import { useAnswers } from "@/session/store";

export default function PrevisitEmailPage() {
  const answers = useAnswers();
  const demo = useDemo();
  if (!answers) return <LoadingScreen />;
  const ctx = visitContext(answers, demo);
  const condition = topicLabels(answers)[0];
  return (
    <AfterVisitScreen stepId="email">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Pre-visit email</h1>
        <p className="text-ink-muted">
          What we&apos;d send before your visit. Logistics and what to expect, not medical advice. Illustrative.
        </p>
      </div>
      {ctx ? (
        previsitEmails(ctx, condition).map((email) => (
          <section key={email.kind} aria-label={`${email.kind} email`} className="flex flex-col gap-2 rounded-lg bg-surface p-4">
            <span className="self-start rounded-full bg-accent-soft px-2 py-0.5 text-sm text-ink-muted">
              {email.kind === "general" ? "General" : "Tailored to what you shared"} · illustrative
            </span>
            <p className="font-medium">{email.subject}</p>
            {email.body.map((line, i) => (
              <p key={i} className="text-sm">{line}</p>
            ))}
          </section>
        ))
      ) : (
        <p className="text-ink-muted">Book a visit to preview your email.</p>
      )}
    </AfterVisitScreen>
  );
}
