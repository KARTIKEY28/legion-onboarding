"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { getTracker } from "@/analytics/client";
import { CLINICIANS } from "@/clinicians/data";
import { nextSlots, type Slot } from "@/clinicians/schedule";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { scenarioForCard, TEST_CARDS, maskCard } from "@/payment/cards";
import type { BookingResult, PaymentScenario } from "@/payment/booking";
import { bookingCostLine, cancellationLine, cardHoldLine, type PaymentPath } from "@/payment/summary";
import { getAnswers, updateAnswers, useAnswers } from "@/session/store";
import { formatCentral } from "@/time";
import { slotTakenArmed } from "@/devtoggles";

type Status = "idle" | "processing" | "auth" | "declined" | "error" | "slot_taken";

export default function PaymentPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  if (!answers.selectedClinician || !answers.selectedSlot) {
    // No chosen visit yet: send the patient back to pick one rather than show an empty summary.
    return (
      <Screen>
        <Progress step="payment" />
        <h1 className="text-2xl font-semibold">Pick a time first</h1>
        <p className="text-ink-muted">Choose a clinician and time, then come back to book.</p>
        <TextLink href="/match" className="self-start">
          Go to Match
        </TextLink>
      </Screen>
    );
  }
  return <PaymentScreen path={answers.insurance?.path ?? "not_sure"} />;
}

function PaymentScreen({ path }: { path: PaymentPath }) {
  const router = useRouter();
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<Slot[] | null>(null);
  const consumedTaken = useRef(false);

  useTrackOnce("payment.viewed", "payment.viewed");

  const clinician = getAnswers().selectedClinician!;
  const slot = getAnswers().selectedSlot!;

  function digitsOk() {
    if (card.replace(/\D/g, "").length < 15) return "Please enter a full card number.";
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) return "Enter the expiry as MM/YY.";
    if (cvc.replace(/\D/g, "").length < 3) return "Enter the 3 or 4 digit security code.";
    if (zip.trim().length < 3) return "Enter your billing ZIP.";
    return null;
  }

  async function book(authenticated = false) {
    // Nothing holds the slot on the server, so re-check availability at booking.
    if (!authenticated && slotTakenArmed() && !consumedTaken.current) {
      consumedTaken.current = true;
      const c = CLINICIANS.find((x) => x.id === clinician.id);
      const windows = getAnswers().needs?.availability ?? [];
      setTakenSlots(c ? nextSlots(c, new Date(), windows.length ? windows : undefined, 3) : []);
      setStatus("slot_taken");
      getTracker()("slot.unavailable_at_booking", { on_step: "payment" });
      return;
    }

    const scenario: PaymentScenario = scenarioForCard(card);
    setStatus("processing");
    let result: BookingResult;
    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, authenticated }),
      });
      if (!response.ok) throw new Error("request failed");
      result = (await response.json()) as BookingResult;
    } catch {
      // Network or server error: keep the entered details and let the patient retry.
      setStatus("error");
      trackOnce("payment.failed:processing_error", "payment.failed", { reason: "processing_error" });
      return;
    }

    if (result.status === "succeeded") {
      updateAnswers({ booked: true });
      trackOnce("payment.succeeded", "payment.succeeded");
      trackOnce("visit.booked", "visit.booked");
      router.push("/confirmation");
      return;
    }
    if (result.status === "requires_action") {
      setStatus("auth");
      return;
    }
    // failed
    if (result.reason === "processing_error") {
      setStatus("error");
      trackOnce("payment.failed:processing_error", "payment.failed", { reason: "processing_error" });
    } else {
      setStatus("declined");
      trackOnce("payment.failed:card_declined", "payment.failed", { reason: "card_declined" });
    }
  }

  function onSubmit() {
    setFieldError(null);
    const err = digitsOk();
    if (err) {
      setFieldError(err);
      return;
    }
    void book(false);
  }

  function pickNewTime(s: Slot) {
    updateAnswers({ selectedSlot: { iso: s.iso, label: s.label } });
    setTakenSlots(null);
    setStatus("idle");
  }

  const busy = status === "processing";

  return (
    <Screen>
      <Progress step="payment" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Payment</h1>
        <p className="text-ink-muted">Your card is saved for after your visit. Nothing is charged today.</p>
      </div>

      {/* Booking summary */}
      <section aria-label="Booking summary" className="flex flex-col gap-1 rounded-lg bg-accent-soft p-4">
        <p className="text-sm text-ink-muted">Your first visit</p>
        <p className="text-lg font-semibold">{clinician.name}</p>
        <p data-testid="booking-when" className="text-base">
          {formatCentral(slot.iso)}
        </p>
        <p className="text-base">{bookingCostLine(path)}</p>
        <p className="text-sm text-ink-muted">{cancellationLine()}</p>
        <div className="mt-1 flex gap-4">
          <TextLink href="/match" className="text-sm">
            Change time
          </TextLink>
          <TextLink href="/cost" className="text-sm">
            Change cost details
          </TextLink>
        </div>
      </section>

      {status === "slot_taken" ? (
        <SlotTaken slots={takenSlots ?? []} onPick={pickNewTime} clinicianName={clinician.name} />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink-muted">{cardHoldLine()}</p>

          {status === "declined" && (
            <Banner tone="danger" title="Your card was declined">
              Your bank didn&apos;t approve the card. Check the number, or try a different card. Your details are kept below.
            </Banner>
          )}
          {status === "error" && (
            <Banner tone="danger" title="Something went wrong">
              We couldn&apos;t reach the payment service. Nothing was charged and your details are kept. Please try again.
            </Banner>
          )}
          {status === "auth" && (
            <Banner tone="accent" title="Your bank needs to confirm it's you">
              <span className="mb-2 block">This card needs one extra step. In test mode we simulate the bank&apos;s screen.</span>
              <button
                type="button"
                onClick={() => void book(true)}
                className="rounded-md border border-accent px-4 py-2 text-base font-medium text-accent"
              >
                Confirm with your bank
              </button>
            </Banner>
          )}

          <CardField id="card" label="Card number" value={card} onChange={(v) => setCard(maskCard(v))} inputMode="numeric" placeholder="1234 1234 1234 1234" disabled={busy} />
          <div className="flex gap-4">
            <CardField id="expiry" label="Expiry (MM/YY)" value={expiry} onChange={setExpiry} inputMode="numeric" placeholder="MM/YY" disabled={busy} className="w-32" />
            <CardField id="cvc" label="Security code" value={cvc} onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="CVC" disabled={busy} className="w-32" />
            <CardField id="zip" label="ZIP" value={zip} onChange={setZip} inputMode="numeric" placeholder="ZIP" disabled={busy} className="w-32" />
          </div>
          {fieldError && (
            <p role="alert" className="text-danger">
              {fieldError}
            </p>
          )}

          <details className="rounded-md bg-surface px-4 py-2 text-sm text-ink-muted">
            <summary className="cursor-pointer">Test cards (prototype, synthetic only)</summary>
            <ul className="mt-2 flex flex-col gap-1">
              <li>Success: {TEST_CARDS.success}</li>
              <li>Declined: {TEST_CARDS.declined}</li>
              <li>Needs bank confirmation: {TEST_CARDS.authRequired}</li>
              <li>Processing error: {TEST_CARDS.processingError}</li>
            </ul>
            <p className="mt-2">Any expiry in the future, any 3-digit code and ZIP. Never enter a real card.</p>
          </details>

          <ActionBar backHref="/cost">
            <PrimaryButton type="submit" className={barPrimary} disabled={busy} aria-busy={busy}>
              {busy ? "Booking…" : "Book my visit"}
            </PrimaryButton>
          </ActionBar>
        </form>
      )}
    </Screen>
  );
}

function SlotTaken({ slots, onPick, clinicianName }: { slots: Slot[]; onPick: (s: Slot) => void; clinicianName: string }) {
  return (
    <section aria-label="That time was just taken" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">That time was just taken</h2>
      <p className="text-ink-muted">
        Nothing held the slot while you were deciding, so it&apos;s gone. Here are {clinicianName}&apos;s next openings — pick one to
        keep going.
      </p>
      <div className="flex flex-col gap-2">
        {slots.length ? (
          slots.map((s) => (
            <button
              key={s.iso}
              type="button"
              onClick={() => onPick(s)}
              className="min-h-11 rounded-md border border-line bg-canvas px-4 py-2 text-left text-base"
            >
              {formatCentral(s.iso)}
            </button>
          ))
        ) : (
          <p className="text-ink-muted">No more openings with this clinician. Choose another from Match.</p>
        )}
      </div>
      <TextLink href="/match" className="self-start text-sm">
        See other clinicians
      </TextLink>
    </section>
  );
}

function Banner({ tone, title, children }: { tone: "danger" | "accent"; title: string; children: React.ReactNode }) {
  const bg = tone === "danger" ? "bg-danger-soft" : "bg-accent-soft";
  return (
    <div role="alert" className={`flex flex-col gap-1 rounded-md ${bg} px-4 py-3`}>
      <p className="font-semibold">{title}</p>
      <div className="text-ink">{children}</div>
    </div>
  );
}

function CardField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  disabled,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-base font-medium">
        {label}
      </label>
      <input
        id={id}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-base text-ink disabled:opacity-60"
      />
    </div>
  );
}
