import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const disputes = await prisma.dispute.findMany({
      where: jobId ? { jobId } : undefined,
      include: {
        evidence: true,
        appeals: true,
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
    const { jobId, initiatedBy, reason } = await request.json();
    if (!jobId || !initiatedBy || !reason) {
      return NextResponse.json(
        { error: "jobId, initiatedBy, and reason are required" },
        { status: 400 },
      );
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        initiatedBy,
        reason,
      },
      include: { evidence: true, appeals: true },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "disputed" },
    });

    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
