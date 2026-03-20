import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { jobId, freelancerAddress, proposal, proposedRate } =
      await request.json();

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

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId,
        freelancerId: freelancer.id,
        proposal,
        proposedRate: proposedRate ? parseFloat(proposedRate) : null,
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
            title: true,
            client: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 },
    );
  }
}
