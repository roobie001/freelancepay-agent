import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, address: true, agentId: true } },
        freelancer: { select: { name: true, address: true, agentId: true } },
        milestones: true,
        applications: {
          include: {
            freelancer: { select: { name: true, address: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        disputes: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = await prisma.job.update({
      where: { id },
      data: {
        blockchainId:
          typeof body.blockchainId === "number" ? body.blockchainId : undefined,
        status: body.status || undefined,
      },
      include: {
        client: { select: { name: true, address: true } },
        milestones: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
