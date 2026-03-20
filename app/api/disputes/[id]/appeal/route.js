import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { reason, evidence } = await request.json();
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 },
      );
    }

    const appeal = await prisma.appeal.create({
      data: {
        disputeId: id,
        reason,
      },
    });

    if (evidence?.length) {
      await prisma.evidence.createMany({
        data: evidence.map((item) => ({
          disputeId: id,
          appealId: appeal.id,
          submittedBy: item.submittedBy,
          role: item.role,
          type: item.type || "other",
          uri: item.uri,
          description: item.description || undefined,
          isAppeal: true,
        })),
      });
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: { status: "appealed" },
      include: { evidence: true, appeals: true },
    });

    return NextResponse.json({ appeal, dispute: updated });
  } catch (error) {
    console.error("Error creating appeal:", error);
    return NextResponse.json(
      { error: "Failed to create appeal", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
