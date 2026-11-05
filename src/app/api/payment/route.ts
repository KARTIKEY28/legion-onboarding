import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateBooking } from "@/payment/booking";
import { assertTestKeysOnly } from "@/payment/stripe";

/**
 * Runs the booking: a one-dollar test-mode authorization (placed then released) and a
 * SetupIntent to save the card for charging after the visit. The browser sends
 * only the scenario it derived from the (test) card number, never the card
 * itself, so no card data reaches the server. Nothing is stored or logged.
 *
 * With real test keys present this is where the Stripe PaymentIntent and
 * SetupIntent would run; this public repo ships with none, so the deterministic
 * mock runs. A live key would have failed startup (src/instrumentation.ts).
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  scenario: z.enum(["success", "declined", "auth_required", "processing_error"]),
  authenticated: z.boolean().optional(),
});

export async function POST(request: Request) {
  assertTestKeysOnly();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const result = simulateBooking(parsed.data.scenario, parsed.data.authenticated ?? false);
  return NextResponse.json(result);
}
