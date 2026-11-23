import { NextResponse } from "next/server";
import { z } from "zod";
import { costPathSchema, costSummary, templateCost } from "@/ai/cost";
import { getModel } from "@/ai/provider";

// Never cached: the summary depends on the patient's insurance path.
export const dynamic = "force-dynamic";

const bodySchema = z.object({ path: costPathSchema });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await costSummary(parsed.data.path, await getModel()));
  } catch {
    return NextResponse.json({ sections: templateCost(parsed.data.path), source: "template" });
  }
}
