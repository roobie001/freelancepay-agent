import { prisma } from "../../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../../lib/timeline";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { jobId, index } = await request.json();
    if (!jobId && jobId !== "") {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 },
      );
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        jobId,
        index,
      },
      include: { job: { include: { client: true, freelancer: true, agreement: true } } },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: "paid" },
    });

    if (milestone.job?.freelancerId) {
      await prisma.notification.create({
        data: {
          userId: milestone.job.freelancerId,
          type: "milestone_paid",
          title: "Milestone paid",
          message: `A milestone was marked as paid for job "${milestone.job.title}".`,
          data: { jobId, milestoneIndex: index },
        },
      });
    }

    await safeCreateTimelineEvent({
      jobId,
      agreementId: milestone.job?.agreement?.id || null,
      type: "milestone_paid",
      metadata: { milestoneIndex: index, amount: milestone.amount },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error marking milestone paid:", error);
    return NextResponse.json(
      { error: "Failed to mark milestone paid", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
