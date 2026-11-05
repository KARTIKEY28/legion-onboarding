"use client";

import { Screen } from "@/components/ui";

// Minimal landing after a successful booking. Slice 7 builds the full
// "Booking confirmed" screen (and the rest of the after-payment experience).
export default function ConfirmationLanding() {
  return (
    <Screen>
      <h1 className="text-2xl font-semibold">Booking confirmed</h1>
      <p className="text-ink-muted">Your visit is booked. The full confirmation experience is next.</p>
    </Screen>
  );
}
