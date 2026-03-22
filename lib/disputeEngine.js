import { prisma } from "./prisma";
import { resolveJobDispute } from "./disputeResolver";

const AI_PROMPT = `You are an impartial dispute resolution system.

Evaluate the dispute using:
1. Contract agreement (highest priority)
2. Evidence provided
3. Timeline of events

Rules:
- Prefer verifiable evidence over claims
- Check if deliverables were met
- Check if scope changes were agreed
- Identify responsibility

Return ONLY JSON:
{
  decision: "client" | "freelancer" | "partial",
  confidence: number (0-1),
  reasoning: string,
  paymentSplit: {
    freelancer: number,
    clientRefund: number
  }
}`;

function normalizeMilestones(jobMilestones, agreementMilestones) {
  if (Array.isArray(jobMilestones) && jobMilestones.length) {
    return jobMilestones.map((m) => ({
      index: m.index,
      amount: m.amount,
      status: m.status,
    }));
  }
  if (Array.isArray(agreementMilestones) && agreementMilestones.length) {
    return agreementMilestones.map((m, idx) => ({
      index: typeof m.index === "number" ? m.index : idx,
      title: m.title || null,
      amount: m.amount || 0,
      duration: m.duration || null,
    }));
  }
  return [];
}

function groupEvidence(items) {
  const grouped = { client: [], freelancer: [], other: [] };
  for (const item of items || []) {
    const entry = {
      type: item.type,
      uri: item.uri,
      description: item.description || "",
      role: item.role,
      isAppeal: item.isAppeal || false,
      createdAt: item.createdAt,
    };
    if (item.role === "client") grouped.client.push(entry);
    else if (item.role === "freelancer") grouped.freelancer.push(entry);
    else grouped.other.push(entry);
  }
  return grouped;
}

function normalizeDecision(decision) {
  const fallbackSplit = { freelancer: 50, clientRefund: 50 };
  const paymentSplit =
    decision?.paymentSplit && typeof decision.paymentSplit === "object"
      ? {
          freelancer:
            typeof decision.paymentSplit.freelancer === "number"
              ? decision.paymentSplit.freelancer
              : typeof decision.paymentSplit.client === "number"
              ? 100 - decision.paymentSplit.client
              : fallbackSplit.freelancer,
          clientRefund:
            typeof decision.paymentSplit.clientRefund === "number"
              ? decision.paymentSplit.clientRefund
              : typeof decision.paymentSplit.client === "number"
              ? decision.paymentSplit.client
              : fallbackSplit.clientRefund,
        }
      : fallbackSplit;

  return {
    decision: decision?.decision || "partial",
    confidence:
      typeof decision?.confidence === "number" ? decision.confidence : 0.5,
    reasoning: decision?.reasoning || "No reasoning provided",
    paymentSplit,
  };
}

export async function buildDisputeCase(disputeId, { appealId } = {}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      job: {
        include: {
          milestones: true,
          client: true,
          freelancer: true,
        },
      },
      agreement: {
        include: {
          application: true,
          client: true,
          freelancer: true,
        },
      },
      evidence: true,
      appeals: { include: { evidence: true } },
      decisions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  const submissions = await prisma.submission.findMany({
    where: { jobId: dispute.jobId },
    orderBy: { createdAt: "asc" },
  });

  const timeline = await prisma.timelineEvent.findMany({
    where: { jobId: dispute.jobId },
    orderBy: { createdAt: "asc" },
  });

  const appeal =
    appealId && dispute.appeals?.length
      ? dispute.appeals.find((item) => item.id === appealId)
      : null;

  const job = dispute.job;
  const agreement = dispute.agreement;
  const milestones = normalizeMilestones(
    job?.milestones || [],
    agreement?.milestones || [],
  );

  let parsedReasonDetails = dispute.reasonDetails || "";
  if (typeof parsedReasonDetails === "string") {
    try {
      parsedReasonDetails = JSON.parse(parsedReasonDetails);
    } catch (_) {
      // keep as string
    }
  }

  const caseData = {
    dispute: {
      id: dispute.id,
      reasonType: dispute.reasonType,
      reason: dispute.reason,
      reasonDetails: parsedReasonDetails,
      initiatedBy: dispute.initiatedBy,
      createdAt: dispute.createdAt,
    },
    contract: agreement
      ? {
          id: agreement.id,
          agreedAmount: agreement.agreedAmount,
          deliverables: agreement.deliverables || "",
          deadlineDays: agreement.deadlineDays,
          milestones,
          createdAt: agreement.createdAt,
        }
      : null,
    job: job
      ? {
          id: job.id,
          title: job.title,
          description: job.description,
          budget: job.budget,
          status: job.status,
        }
      : null,
    submissions: submissions.map((item) => ({
      id: item.id,
      uri: item.uri,
      description: item.description || "",
      freelancerId: item.freelancerId,
      createdAt: item.createdAt,
    })),
    timeline: timeline.map((event) => ({
      id: event.id,
      type: event.type,
      metadata: event.metadata || null,
      createdAt: event.createdAt,
    })),
    evidence: groupEvidence(dispute.evidence || []),
    appeal: appeal
      ? {
          id: appeal.id,
          reason: appeal.reason,
          createdAt: appeal.createdAt,
          evidence: groupEvidence(appeal.evidence || []),
        }
      : null,
    previousDecision: dispute.decisions?.[0]
      ? {
          decision: dispute.decisions[0].decision,
          confidence: dispute.decisions[0].confidence,
          reasoning: dispute.decisions[0].reasoning,
          paymentSplit: dispute.decisions[0].paymentSplit,
          createdAt: dispute.decisions[0].createdAt,
        }
      : null,
  };

  return caseData;
}

export async function evaluateDispute(caseData) {
  const result = await resolveJobDispute(caseData.job?.id || "unknown", {
    prompt: AI_PROMPT,
    disputePayload: caseData,
  });

  return normalizeDecision(result);
}
