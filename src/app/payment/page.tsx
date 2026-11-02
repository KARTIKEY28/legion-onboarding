"use client";

import { useTrackOnce } from "@/analytics/hooks";
import { Progress, Screen, TextLink } from "@/components/ui";

/**
 * Payment stub. Stripe test-mode payment is the next slice (slice 6); this just
 * marks where it lands so the flow is complete end to end. Nothing is booked or
 * charged here.
 */
export default function PaymentStub() {
  useTrackOnce("payment.viewed", "payment.viewed");
  return (
    <Screen>
      <Progress step="payment" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Payment comes next</h1>
        <p className="text-ink-muted">Payment comes in the next slice. Nothing has been booked or charged.</p>
      </div>
      <TextLink href="/cost" className="self-start">
        Back to cost and terms
      </TextLink>
    </Screen>
  );
}
