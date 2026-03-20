import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { evidence: true, appeals: true },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        aiDecision: body.aiDecision || undefined,
        resolved: typeof body.resolved === "boolean" ? body.resolved : undefined,
        status: body.status || undefined,
        resolvedAt: body.resolved ? new Date() : undefined,
      },
      include: { evidence: true, appeals: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dispute:", error);
    return NextResponse.json(
      { error: "Failed to update dispute", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
