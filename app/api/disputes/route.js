import { prisma } from "../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../lib/timeline";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const address = searchParams.get("address");

    const disputes = await prisma.dispute.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(address
          ? {
              job: {
                OR: [
                  { client: { address } },
                  { freelancer: { address } },
                ],
              },
            }
          : {}),
      },
      include: {
        evidence: true,
        appeals: true,
        decisions: { orderBy: { createdAt: "desc" } },
        agreement: true,
        job: {
          include: {
            client: { select: { name: true, address: true } },
            freelancer: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const {
      jobId,
      contractId,
      initiatedBy,
      reason,
      reasonType,
      reasonDetails,
      evidence,
      autoResolve,
    } = await request.json();
    if (!jobId || !contractId || !initiatedBy || !reason) {
      return NextResponse.json(
        { error: "jobId, contractId, initiatedBy, and reason are required" },
        { status: 400 },
      );
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: contractId },
      include: { job: true, client: true, freelancer: true },
    });
    if (!agreement) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    if (agreement.jobId !== jobId) {
      return NextResponse.json(
        { error: "contractId does not match jobId" },
        { status: 400 },
      );
    }

    const normalizedAddress = initiatedBy.toLowerCase();
    const isClient =
      agreement.client?.address?.toLowerCase() === normalizedAddress;
    const isFreelancer =
      agreement.freelancer?.address?.toLowerCase() === normalizedAddress;
    if (!isClient && !isFreelancer) {
      return NextResponse.json(
        { error: "Only the client or freelancer can open a dispute" },
        { status: 403 },
      );
    }
    const role = isClient ? "client" : "freelancer";

    const existingDispute = await prisma.dispute.findFirst({
      where: {
        agreementId: contractId,
        status: { in: ["open", "appealed"] },
      },
    });
    if (existingDispute) {
      return NextResponse.json(
        { error: "A dispute already exists for this contract" },
        { status: 409 },
      );
    }

    let initiator = await prisma.user.findUnique({
      where: { address: initiatedBy },
    });
    if (!initiator) {
      initiator = await prisma.user.create({
        data: { address: initiatedBy, role },
      });
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        agreementId: contractId,
        initiatedBy: initiator.id,
        reason,
        reasonType: reasonType || "other",
        reasonDetails: reasonDetails || undefined,
        evidence: evidence?.length
          ? {
              create: await Promise.all(
                evidence.map(async (item) => {
                  let submitter = await prisma.user.findUnique({
                    where: { address: item.submittedBy },
                  });
                  if (!submitter) {
                    submitter = await prisma.user.create({
                      data: { address: item.submittedBy, role: item.role },
                    });
                  }
                  return {
                    submittedBy: submitter.id,
                    role: item.role,
                    type: item.type || "other",
                    uri: item.uri,
                    description: item.description || undefined,
                  };
                }),
              ),
            }
          : undefined,
      },
      include: { evidence: true, appeals: true, decisions: true },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "disputed" },
    });

    await safeCreateTimelineEvent({
      jobId,
      agreementId: contractId,
      disputeId: dispute.id,
      type: "dispute_raised",
      metadata: {
        reasonType: dispute.reasonType,
        initiatorId: initiator.id,
      },
    });

    const shouldAutoResolve = autoResolve === undefined ? true : !!autoResolve;
    if (shouldAutoResolve) {
      try {
        const origin = new URL(request.url).origin;
        await fetch(`${origin}/api/disputes/${dispute.id}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Auto resolve failed:", err);
      }
    }

    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
