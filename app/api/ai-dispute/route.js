import { NextResponse } from "next/server";
import { resolveJobDispute } from "../../../lib/disputeResolver";
import { prisma } from "../../../lib/prisma";

export async function POST(request) {
  try {
    const { jobId, disputeId, disputePayload } = await request.json();
    if (!jobId || !disputePayload) {
      return NextResponse.json(
        { error: "jobId and disputePayload are required" },
        { status: 400 },
      );
    }

    const prompt = `
You are an impartial dispute resolution agent.

Analyze the case based on:
1. Original contract scope
2. Evidence provided
3. Validity of claims

Rules:
- Prefer verifiable evidence over statements
- Check if scope was fulfilled
- Check if changes were agreed upon

Return JSON:
{
  decision: "client" | "freelancer" | "partial",
  confidence: number (0-1),
  reasoning: string,
  paymentSplit: { freelancer: %, client: % }
}
`;

    const result = await resolveJobDispute(jobId, { prompt, disputePayload }, "");

    if (disputeId) {
      await prisma.decision.upsert({
        where: { disputeId },
        create: {
          disputeId,
          decision: result.decision || "partial",
          confidence: result.confidence || 0.5,
          reasoning: result.reasoning || "No reasoning provided",
          paymentSplit: result.paymentSplit || { freelancer: 50, client: 50 },
          isAppeal: !!disputePayload?.isAppeal,
        },
        update: {
          decision: result.decision || "partial",
          confidence: result.confidence || 0.5,
          reasoning: result.reasoning || "No reasoning provided",
          paymentSplit: result.paymentSplit || { freelancer: 50, client: 50 },
          isAppeal: !!disputePayload?.isAppeal,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI dispute error:", error);
    return NextResponse.json(
      { error: "AI dispute failed", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
