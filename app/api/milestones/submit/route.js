import { prisma } from "../../../../lib/prisma";
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
      include: { job: { include: { client: true, freelancer: true } } },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: "submitted" },
    });

    if (milestone.job?.clientId) {
      await prisma.notification.create({
        data: {
          userId: milestone.job.clientId,
          type: "milestone_submitted",
          title: "Milestone submitted",
          message: `A milestone was submitted for job "${milestone.job.title}".`,
          data: { jobId, milestoneIndex: index },
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error submitting milestone:", error);
    return NextResponse.json(
      { error: "Failed to submit milestone", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
