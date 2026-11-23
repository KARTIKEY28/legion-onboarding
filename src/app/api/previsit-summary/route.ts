import { NextResponse } from "next/server";
import { getModel } from "@/ai/provider";
import { composeSummary, previsitInputSchema, templateSummary } from "@/ai/previsit";

// Never cached: the summary depends on the patient's answers.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = previsitInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await composeSummary(parsed.data, await getModel()));
  } catch {
    return NextResponse.json({ text: templateSummary(parsed.data), source: "template" });
  }
}
