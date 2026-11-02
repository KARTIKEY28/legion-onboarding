import { NextResponse } from "next/server";
import { getModel } from "@/ai/provider";
import { reflectBack, reflectInputSchema, templateReflection } from "@/ai/reflect";

// Never cached: each line is built from one patient's answers.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = reflectInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await reflectBack(parsed.data, await getModel()));
  } catch {
    return NextResponse.json({ text: templateReflection(parsed.data), source: "template" });
  }
}
