import { prisma } from "../../../../../lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const id =
      params?.id ||
      new URL(request.url).pathname.split("/").filter(Boolean).slice(-2, -1)[0];
    if (!id) {
      return NextResponse.json(
        { error: "Application id is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { client: true } },
        freelancer: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (
      body?.clientAddress &&
      application.job?.client?.address?.toLowerCase() !==
        body.clientAddress.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Only the job owner can accept a proposal" },
        { status: 403 },
      );
    }

    const contract = {
      jobId: application.jobId,
      client: application.job?.client?.address,
      freelancer: application.freelancer?.address,
      agreedAmount: application.bidAmount || application.proposedRate || 0,
      milestones: application.milestones || [],
      deliverables: application.deliverables || "",
      deadline: application.timelineDays || null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    const contractHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(contract))
      .digest("hex");

    await prisma.application.update({
      where: { id },
      data: { status: "accepted" },
    });

    await prisma.application.updateMany({
      where: {
        jobId: application.jobId,
        id: { not: id },
      },
      data: { status: "rejected" },
    });

    await prisma.job.update({
      where: { id: application.jobId },
      data: {
        freelancerId: application.freelancerId,
        status: "in_progress",
      },
    });

    await prisma.agreement.create({
      data: {
        jobId: application.jobId,
        applicationId: application.id,
        clientId: application.job.clientId,
        freelancerId: application.freelancerId,
        agreedAmount: contract.agreedAmount,
        milestones: contract.milestones,
        deliverables: contract.deliverables,
        deadlineDays: contract.deadline || null,
        status: "active",
        contractJson: { ...contract, contractHash },
      },
    });

    return NextResponse.json({ ok: true, contractHash });
  } catch (error) {
    console.error("Error accepting application:", error);
    return NextResponse.json(
      {
        error: "Failed to accept application",
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
