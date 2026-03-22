import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    return NextResponse.json(
      {
        error: "This endpoint is deprecated. Use /api/disputes/:id/resolve.",
      },
      { status: 410 },
    );
  } catch (error) {
    console.error("AI dispute error:", error);
    return NextResponse.json(
      { error: "AI dispute failed", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
