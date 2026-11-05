"use client";

import { useEffect, useRef, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { previsitInput, availabilityLabels, topicLabels } from "@/aftervisit/answers";
import { AfterVisitScreen, useDemo } from "@/components/aftervisit";
import { LoadingScreen } from "@/components/ui";
import { flags } from "@/flags";
import { useAnswers, type SessionAnswers } from "@/session/store";
import type { PrevisitSummary } from "@/ai/previsit";
import { templateSummary } from "@/ai/previsit";

export default function BeforeVisitPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  return (
    <AfterVisitScreen stepId="before">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Before your visit</h1>
        <p className="text-ink-muted">A few optional things that help your clinician. Your visit happens either way.</p>
      </div>
      <IntakeForms answers={answers} />
      {flags.previsitSummary && <StorySummary answers={answers} />}
      <PhotoId />
      <InsuranceStatus path={answers.insurance?.path ?? "not_sure"} />
      <OutsideRecords />
      <VideoLink />
    </AfterVisitScreen>
  );
}

function Card({ title, children, tag }: { title: string; children: React.ReactNode; tag?: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {tag && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-sm text-ink-muted">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

function IntakeForms({ answers }: { answers: SessionAnswers }) {
  const [done, setDone] = useState(false);
  useTrackOnce("intake.started", "intake.started");
  const topics = topicLabels(answers);
  const times = availabilityLabels(answers);
  const path = answers.insurance?.path ?? "not_sure";
  const safetyAnswered = Boolean(answers.safety?.recentThoughts || answers.safety?.hospitalized);

  function confirm() {
    setDone(true);
    trackOnce("intake.completed", "intake.completed");
  }

  return (
    <Card title="Intake forms" tag="Recommended, not required">
      <p className="text-ink-muted">We&apos;ve filled these in from what you told us. Check them over — no retyping.</p>
      <dl className="flex flex-col gap-2">
        <Prefill label="What brings you in" value={topics.length ? topics.join(", ") : "You'll tell your clinician"} />
        <Prefill label="Times that suit you" value={times.length ? times.join(", ") : "Flexible"} />
        <Prefill label="Payment" value={path === "self_pay" ? "Without insurance" : "Using insurance"} />
        <Prefill label="Safety questions" value={safetyAnswered ? "Answered" : "Not answered"} />
      </dl>
      {done ? (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-2">Thanks — your details are confirmed.</p>
      ) : (
        <button type="button" onClick={confirm} className="self-start rounded-md border border-accent px-4 py-2 text-base font-medium text-accent">
          Confirm my details
        </button>
      )}
    </Card>
  );
}

function Prefill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}

function StorySummary({ answers }: { answers: SessionAnswers }) {
  const [summary, setSummary] = useState<PrevisitSummary | null>(null);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const input = previsitInput(answers);
    const fallback: PrevisitSummary = { text: templateSummary(input), source: "template" };
    const apply = (result: PrevisitSummary) => {
      setSummary(result);
      setText(result.text);
      trackOnce("summary.shown", "summary.shown", { source: result.source });
    };
    fetch("/api/previsit-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((r) => (r.ok ? (r.json() as Promise<PrevisitSummary>) : fallback))
      .then(apply)
      .catch(() => apply(fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onEdit(value: string) {
    setText(value);
    if (!edited) {
      setEdited(true);
      trackOnce("summary.edited", "summary.edited", { edited: true });
    }
  }

  return (
    <Card title="Your story, ready for your clinician" tag="Drafted from your answers">
      <p className="text-ink-muted">Drafted from your answers. You can edit or remove anything. Only shared if you choose to.</p>
      {summary ? (
        <>
          <textarea
            aria-label="Your pre-visit summary"
            data-testid="summary-text"
            data-source={summary.source}
            value={text}
            onChange={(e) => onEdit(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-line bg-canvas p-3 text-base text-ink"
          />
          <div className="flex gap-4">
            <button type="button" onClick={() => onEdit("")} className="text-base text-accent underline underline-offset-2">
              Remove
            </button>
          </div>
        </>
      ) : (
        <span aria-label="Loading" className="block h-24 w-full animate-pulse rounded-md bg-line" />
      )}
    </Card>
  );
}

function PhotoId() {
  const [state, setState] = useState<"idle" | "uploaded" | "skipped">("idle");
  function upload() {
    setState("uploaded");
    trackOnce("id.uploaded", "id.uploaded", { uploaded: true });
  }
  function skip() {
    setState("skipped");
    trackOnce("id.uploaded", "id.uploaded", { uploaded: false });
  }
  return (
    <Card title="Photo ID" tag="Optional">
      <p className="text-ink-muted">A photo ID helps us confirm who you are. You can do this later.</p>
      <p className="rounded-md bg-danger-soft px-4 py-2 text-sm">
        Demo only — don&apos;t upload a real ID. Here&apos;s a synthetic sample. Nothing you add is stored after this preview.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static synthetic SVG, no optimization needed */}
      <img src="/sample-id.svg" alt="Synthetic sample ID, not a real document" width={240} height={150} className="rounded-md border border-line" />
      {state === "uploaded" ? (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-2">Sample received — not stored.</p>
      ) : state === "skipped" ? (
        <p role="status" className="rounded-md bg-surface px-4 py-2 text-ink-muted">No problem — you can add it later.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={upload} className="rounded-md border border-accent px-4 py-2 text-base font-medium text-accent">
            Use the synthetic sample
          </button>
          <button type="button" onClick={skip} className="rounded-md border border-line px-4 py-2 text-base">
            I don&apos;t have it handy
          </button>
        </div>
      )}
    </Card>
  );
}

const INSURANCE_COPY = {
  checking: { title: "Checking your coverage", body: "We're verifying your insurance now. You don't need to do anything.", can: "We'll email you the moment it's confirmed." },
  confirmed: { title: "Coverage confirmed", body: "Your insurance is confirmed. Your cost estimate is on its way.", can: "Nothing to do here." },
  more_info: { title: "We need a little more information", body: "We couldn't verify your coverage yet. Our team will follow up.", can: "You can reply to our email with your plan details, or switch to paying without insurance." },
} as const;

function InsuranceStatus({ path }: { path: "insured" | "self_pay" | "not_sure" }) {
  const demo = useDemo();
  const state = path === "self_pay" ? "self_pay" : demo.insuranceState;
  useTrackOnce(`insurance.status_viewed:${state}`, "insurance.status_viewed", () => ({ state }));

  if (state === "self_pay") {
    return (
      <Card title="Paying without insurance">
        <p className="text-ink-muted">You chose to pay without insurance, so there&apos;s no coverage to check.</p>
      </Card>
    );
  }
  const copy = INSURANCE_COPY[state];
  return (
    <Card title="Insurance">
      <p data-testid="insurance-state" data-state={state} className="text-lg font-medium">{copy.title}</p>
      <p className="text-ink-muted">{copy.body}</p>
      <p className="text-sm text-ink-muted">{copy.can}</p>
    </Card>
  );
}

function OutsideRecords() {
  const [choice, setChoice] = useState<"granted" | "declined" | null>(null);
  function decide(granted: boolean) {
    setChoice(granted ? "granted" : "declined");
    trackOnce("records.consent", "records.consent", { granted });
  }
  return (
    <Card title="Your past records" tag="Your choice">
      <p className="text-ink-muted">
        With your OK, Legion asks your past providers for records so your clinician has the full picture. It&apos;s not required and
        won&apos;t hold up your visit.
      </p>
      {choice ? (
        <p role="status" className="rounded-md bg-accent-soft px-4 py-2">
          {choice === "granted" ? "Thanks — we'll request your records." : "Okay — we won't request any records."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => decide(true)} className="rounded-md border border-accent px-4 py-2 text-base font-medium text-accent">
            Allow record requests
          </button>
          <button type="button" onClick={() => decide(false)} className="rounded-md border border-line px-4 py-2 text-base">
            Not now
          </button>
        </div>
      )}
    </Card>
  );
}

function VideoLink() {
  return (
    <Card title="Your video visit">
      <p className="text-ink-muted">Your join link will appear here before your visit. No app to download.</p>
    </Card>
  );
}
