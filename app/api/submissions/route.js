import { prisma } from "../../../lib/prisma";
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

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
