import { NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/ai/provider";
import { removeIdentifiers } from "@/ai/redact";
import { REFLECT_TIMEOUT_MS } from "@/ai/reflect";
import { localSafetyCheck } from "@/safety/local";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ text: z.string().min(1).max(1000) });

/**
 * The model's second look at free text. It can only escalate: the browser has
 * already run the local check, and only calls this when that found nothing.
 * Any error or timeout answers { escalate: false }, which leaves the local result standing.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const { text } = parsed.data;

  if (localSafetyCheck(text).concern) return NextResponse.json({ escalate: true, source: "local" });

  const model = await getModel();
  if (!model) return NextResponse.json({ escalate: false, source: "unavailable" });
  try {
    const escalate = await Promise.race([
      model.mayIndicateRisk(removeIdentifiers(text)),
      new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error("timeout")), REFLECT_TIMEOUT_MS)),
    ]);
    return NextResponse.json({ escalate, source: "model" });
  } catch {
    return NextResponse.json({ escalate: false, source: "unavailable" });
  }
}
