import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { buildDisputeCase, evaluateDispute } from "../../../../../lib/disputeEngine";
import { safeCreateTimelineEvent } from "../../../../../lib/timeline";
import { executeEscrowPayoutForContract } from "../../../../../lib/escrowPayout";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "dispute id is required" }, { status: 400 });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { agreement: { include: { job: true } } },
    });
    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const alreadyPaid = await prisma.decision.findFirst({
      where: { disputeId: id, executedOnChain: true },
    });
    if (alreadyPaid) {
      return NextResponse.json(
        { error: "Payout already executed for this dispute" },
        { status: 409 },
      );
    }

    const caseData = await buildDisputeCase(id);
    const result = await evaluateDispute(caseData);

    const decision = await prisma.decision.create({
      data: {
        disputeId: id,
        decision: result.decision,
        confidence: result.confidence,
        reasoning: result.reasoning,
        paymentSplit: result.paymentSplit,
        isAppeal: false,
      },
    });

    if (!dispute.agreementId) {
      return NextResponse.json(
        {
          error: "Missing contractId for escrow payout",
          decision,
        },
        { status: 400 },
      );
    }

    const payout = await executeEscrowPayoutForContract({
      contractId: dispute.agreementId,
      decision: decision.decision,
      paymentSplit: decision.paymentSplit,
    });

    await prisma.decision.update({
      where: { id: decision.id },
      data: {
        txHash: payout.txHash,
        executedOnChain: true,
      },
    });

    if (dispute.agreementId) {
      await prisma.agreement.update({
        where: { id: dispute.agreementId },
        data: { status: "completed" },
      });
    }

    await prisma.dispute.update({
      where: { id },
      data: { status: "resolved", resolved: true, resolvedAt: new Date() },
    });

    await safeCreateTimelineEvent({
      jobId: dispute.jobId,
      agreementId: dispute.agreementId || null,
      disputeId: id,
      type: "dispute_resolved",
      metadata: {
        decision: decision.decision,
        confidence: decision.confidence,
        isAppeal: false,
      },
    });

    await safeCreateTimelineEvent({
      jobId: dispute.jobId,
      agreementId: dispute.agreementId || null,
      disputeId: id,
      type: "escrow_payout",
      metadata: {
        txHash: payout.txHash,
        freelancerBps: payout.bps,
      },
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return NextResponse.json(
      { error: "Failed to resolve dispute", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
