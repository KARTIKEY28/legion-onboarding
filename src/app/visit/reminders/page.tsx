"use client";

import { visitContext } from "@/aftervisit/answers";
import { reminderCards } from "@/aftervisit/content";
import { AfterVisitAction, AfterVisitScreen, useDemo } from "@/components/aftervisit";
import { LoadingScreen } from "@/components/ui";
import { useAnswers } from "@/session/store";

export default function RemindersPage() {
  const answers = useAnswers();
  const demo = useDemo();
  if (!answers) return <LoadingScreen />;
  const ctx = visitContext(answers, demo);
  return (
    <AfterVisitScreen stepId="reminders">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Your reminders</h1>
        <p className="text-ink-muted">
          How your reminders look, as email and text. They change with whether your forms and insurance are done. Flip the demo
          controls to see.
        </p>
      </div>
      {ctx ? (
        reminderCards(ctx).map((card) => (
          <section key={card.lead} aria-label={`${card.lead} reminder`} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
            <h2 className="text-lg font-semibold">{card.lead} before</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <article className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-3" aria-label="Email reminder">
                <p className="text-sm font-medium text-ink-muted">Email</p>
                <p className="font-medium">{card.email.subject}</p>
                {card.email.body.map((line, i) => (
                  <p key={i} className="text-sm">{line}</p>
                ))}
              </article>
              <article className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-3" aria-label="Text reminder">
                <p className="text-sm font-medium text-ink-muted">Text message</p>
                <p className="text-sm">{card.sms}</p>
              </article>
            </div>
          </section>
        ))
      ) : (
        <p className="text-ink-muted">Book a visit to preview your reminders.</p>
      )}
      <AfterVisitAction href="/confirmation">Back to your visit</AfterVisitAction>
    </AfterVisitScreen>
  );
}
