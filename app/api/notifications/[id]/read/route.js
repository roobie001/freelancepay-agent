import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error marking notification read:", error);
    return NextResponse.json(
      { error: "Failed to update notification", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
