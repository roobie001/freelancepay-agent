import { prisma } from "../../../../../lib/prisma";
import { safeCreateTimelineEvent } from "../../../../../lib/timeline";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { submittedBy, role, uri, description, type, isAppeal, appealId } =
      await request.json();

    if (!submittedBy || !role || !uri) {
      return NextResponse.json(
        { error: "submittedBy, role, and uri are required" },
        { status: 400 },
      );
    }

    let user = await prisma.user.findUnique({
      where: { address: submittedBy },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { address: submittedBy, role },
      });
    }

    const evidence = await prisma.evidence.create({
      data: {
        disputeId: id,
        appealId: appealId || null,
        submittedBy: user.id,
        role,
        type: type || "other",
        uri,
        description,
        isAppeal: !!isAppeal,
      },
    });

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { agreement: true },
    });
    await safeCreateTimelineEvent({
      jobId: dispute?.jobId,
      agreementId: dispute?.agreementId || null,
      disputeId: id,
      type: "evidence_added",
      metadata: { role, type: evidence.type },
    });

    return NextResponse.json(evidence);
  } catch (error) {
    console.error("Error adding evidence:", error);
    return NextResponse.json(
      { error: "Failed to add evidence", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
