import { prisma } from "../../../../../lib/prisma";
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

    const evidence = await prisma.evidence.create({
      data: {
        disputeId: id,
        appealId: appealId || null,
        submittedBy,
        role,
        type: type || "other",
        uri,
        description,
        isAppeal: !!isAppeal,
      },
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
