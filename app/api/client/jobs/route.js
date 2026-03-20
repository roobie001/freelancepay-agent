import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 },
      );
    }

    const jobs = await prisma.job.findMany({
      where: {
        client: {
          address,
        },
      },
      include: {
        client: { select: { name: true, address: true } },
        milestones: true,
        applications: {
          include: {
            freelancer: { select: { name: true, address: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching client jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch client jobs", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
