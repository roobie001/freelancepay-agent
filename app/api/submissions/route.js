import { prisma } from "../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../lib/timeline";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { jobId, freelancerAddress, uri, description } =
      await request.json();

    if (!jobId || !freelancerAddress || !uri) {
      return NextResponse.json(
        { error: "jobId, freelancerAddress, and uri are required" },
        { status: 400 },
      );
    }

    const freelancer = await prisma.user.findUnique({
      where: { address: freelancerAddress },
    });
    if (!freelancer) {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 },
      );
    }

    const submission = await prisma.submission.create({
      data: {
        jobId,
        freelancerId: freelancer.id,
        uri,
        description: description || null,
      },
    });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { agreement: true },
    });

    await safeCreateTimelineEvent({
      jobId,
      agreementId: job?.agreement?.id || null,
      type: "submission_uploaded",
      metadata: { submissionId: submission.id, freelancerId: freelancer.id },
    });

    if (job?.clientId) {
      await prisma.notification.create({
        data: {
          userId: job.clientId,
          type: "submission_uploaded",
          title: "Work submitted",
          message: `A new submission was uploaded for job "${job.title}".`,
          data: { jobId, submissionId: submission.id },
        },
      });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
