import { prisma } from "../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../lib/timeline";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: "open",
      },
      include: {
        client: {
          select: {
            name: true,
            address: true,
            agentId: true,
          },
        },
        milestones: true,
        applications: {
          include: {
            freelancer: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch jobs",
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const {
      title,
      description,
      budget,
      clientAddress,
      milestones = [],
    } = await request.json();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: clientAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: clientAddress,
          role: "client",
        },
      });
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        title,
        description,
        budget: parseFloat(budget),
        clientId: user.id,
        milestones: milestones.length
          ? {
              create: milestones.map((amount, index) => ({
                index,
                amount: parseFloat(amount),
                status: "pending",
              })),
            }
          : undefined,
      },
      include: {
        client: {
          select: {
            name: true,
            address: true,
            agentId: true,
          },
        },
        milestones: true,
      },
    });

    await safeCreateTimelineEvent({
      jobId: job.id,
      type: "job_created",
      metadata: { clientId: user.id, budget: job.budget },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      {
        error: "Failed to create job",
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
