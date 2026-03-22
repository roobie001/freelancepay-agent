import { prisma } from "../../../../../lib/prisma";
import { buildDisputeCase, evaluateDispute } from "../../../../../lib/disputeEngine";
import { safeCreateTimelineEvent } from "../../../../../lib/timeline";
import { executeEscrowPayoutForContract } from "../../../../../lib/escrowPayout";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { reason, evidence } = await request.json();
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 },
      );
    }

    const appeal = await prisma.appeal.create({
      data: {
        disputeId: id,
        reason,
      },
    });

    if (evidence?.length) {
      const mappedEvidence = await Promise.all(
        evidence.map(async (item) => {
          let user = await prisma.user.findUnique({
            where: { address: item.submittedBy },
          });
          if (!user) {
            user = await prisma.user.create({
              data: { address: item.submittedBy, role: item.role },
            });
          }
          return {
            disputeId: id,
            appealId: appeal.id,
            submittedBy: user.id,
            role: item.role,
            type: item.type || "other",
            uri: item.uri,
            description: item.description || undefined,
            isAppeal: true,
          };
        }),
      );
      await prisma.evidence.createMany({
        data: mappedEvidence,
      });
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: { status: "resolved", resolved: true, resolvedAt: new Date() },
      include: { evidence: true, appeals: true, decisions: true },
    });

    await safeCreateTimelineEvent({
      jobId: updated.jobId,
      agreementId: updated.agreementId || null,
      disputeId: id,
      type: "appeal_submitted",
      metadata: { appealId: appeal.id },
    });

    const caseData = await buildDisputeCase(id, { appealId: appeal.id });
    const result = await evaluateDispute(caseData);

    const decision = await prisma.decision.create({
      data: {
        disputeId: id,
        appealId: appeal.id,
        decision: result.decision,
        confidence: result.confidence,
        reasoning: result.reasoning,
        paymentSplit: result.paymentSplit,
        isAppeal: true,
      },
    });

    const alreadyPaid = await prisma.decision.findFirst({
      where: { disputeId: id, executedOnChain: true },
    });

    if (!alreadyPaid) {
      const dispute = await prisma.dispute.findUnique({
        where: { id },
      });
      if (dispute?.agreementId) {
        const payout = await executeEscrowPayoutForContract({
          contractId: dispute.agreementId,
          decision: decision.decision,
          paymentSplit: decision.paymentSplit,
        });
        await prisma.decision.update({
          where: { id: decision.id },
          data: { txHash: payout.txHash, executedOnChain: true },
        });
        if (dispute?.agreementId) {
          await prisma.agreement.update({
            where: { id: dispute.agreementId },
            data: { status: "completed" },
          });
        }
        await safeCreateTimelineEvent({
          jobId: dispute.jobId,
          agreementId: dispute.agreementId || null,
          disputeId: id,
          type: "escrow_payout",
          metadata: {
            txHash: payout.txHash,
            freelancerBps: payout.bps,
            isAppeal: true,
          },
        });
      }
    }

    await safeCreateTimelineEvent({
      jobId: updated.jobId,
      agreementId: updated.agreementId || null,
      disputeId: id,
      type: "dispute_resolved",
      metadata: {
        decision: decision.decision,
        confidence: decision.confidence,
        isAppeal: true,
      },
    });

    return NextResponse.json({ appeal, dispute: updated, decision });
  } catch (error) {
    console.error("Error creating appeal:", error);
    return NextResponse.json(
      { error: "Failed to create appeal", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
