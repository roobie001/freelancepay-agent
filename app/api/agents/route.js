import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { address, agentId, agentUri } = await request.json();
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { address },
      update: {
        agentId: typeof agentId === "number" ? agentId : undefined,
        agentUri: agentUri || undefined,
      },
      create: {
        address,
        role: "freelancer",
        agentId: typeof agentId === "number" ? agentId : undefined,
        agentUri: agentUri || undefined,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error registering agent:", error);
    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 },
    );
  }
}
