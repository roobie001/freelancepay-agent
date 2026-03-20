import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error accepting application:", error);
    return NextResponse.json(
      { error: "Failed to accept application", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
