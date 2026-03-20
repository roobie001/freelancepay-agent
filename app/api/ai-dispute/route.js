import { NextResponse } from "next/server";
import { resolveJobDispute } from "../../../lib/disputeResolver";

export async function POST(request) {
  try {
    const { jobId, jobData, submissionData } = await request.json();
    if (!jobId || !submissionData) {
      return NextResponse.json(
        { error: "jobId and submissionData are required" },
        { status: 400 },
      );
    }

    const result = await resolveJobDispute(
      jobId,
      jobData || { description: "" },
      submissionData,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI dispute error:", error);
    return NextResponse.json(
      { error: "AI dispute failed", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}
