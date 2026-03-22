import { prisma } from "./prisma";

export async function createTimelineEvent({
  jobId,
  agreementId = null,
  disputeId = null,
  type,
  metadata = null,
}) {
  if (!jobId || !type) return null;
  return prisma.timelineEvent.create({
    data: {
      jobId,
      agreementId,
      disputeId,
      type,
      metadata,
    },
  });
}

export async function safeCreateTimelineEvent(payload) {
  try {
    return await createTimelineEvent(payload);
  } catch (error) {
    console.error("Failed to create timeline event:", error);
    return null;
  }
}
