import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const application = await prisma.application.update({
      where: { id },
      data: {
        chainTxHash: body.chainTxHash || undefined,
        applicationHash: body.applicationHash || undefined,
        metadataUri: body.metadataUri || undefined,
        status: body.status || undefined,
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
