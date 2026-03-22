import { prisma } from "../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../lib/timeline";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const {
      jobId,
      freelancerAddress,
      proposal,
      proposedRate,
      coverLetter,
      timeline,
      bidAmount,
      deliverables,
      milestones,
      portfolioLink,
      agreedToTerms,
      applicationHash,
      metadataUri,
    } = await request.json();

    // Find or create freelancer user
    let freelancer = await prisma.user.findUnique({
      where: { address: freelancerAddress },
    });

    if (!freelancer) {
      freelancer = await prisma.user.create({
        data: {
          address: freelancerAddress,
          role: "freelancer",
        },
      });
    }

    // Check if application already exists
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_freelancerId: {
          jobId,
          freelancerId: freelancer.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied to this job" },
        { status: 400 },
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { client: true },
    });
    if (job?.client?.address?.toLowerCase() === freelancerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot apply to your own job" },
        { status: 400 },
      );
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId,
        freelancerId: freelancer.id,
        proposal: coverLetter || proposal,
        proposedRate: proposedRate ? parseFloat(proposedRate) : null,
        coverLetter: coverLetter || null,
        timelineDays: timeline ? parseInt(timeline, 10) : null,
        bidAmount: bidAmount ? parseFloat(bidAmount) : null,
        deliverables: deliverables || null,
        milestones: milestones || null,
        portfolioLink: portfolioLink || null,
        agreedToTerms: !!agreedToTerms,
        applicationHash: applicationHash || null,
        metadataUri: metadataUri || null,
      },
      include: {
        freelancer: {
          select: {
            name: true,
            address: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    await safeCreateTimelineEvent({
      jobId: application.job.id,
      agreementId: null,
      type: "proposal_submitted",
      metadata: {
        applicationId: application.id,
        freelancerId: freelancer.id,
        bidAmount: application.bidAmount,
      },
    });

    if (application.job?.client?.id) {
      await prisma.notification.create({
        data: {
          userId: application.job.client.id,
          type: "proposal_submitted",
          title: "New proposal received",
          message: `A freelancer submitted a proposal for "${application.job.title}".`,
          data: { jobId, applicationId: application.id },
        },
      });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 },
    );
  }
}
