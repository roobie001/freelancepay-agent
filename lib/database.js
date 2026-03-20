import { prisma } from "./prisma";
import { postJobOnChain, getJobOnChain } from "./contract";

// Database operations combined with blockchain sync

export async function createJob(
  title,
  description,
  budget,
  clientAddress,
  milestones = [],
) {
  // Create job in database first
  const dbJob = await prisma.job.create({
    data: {
      title,
      description,
      budget: parseFloat(budget),
      client: {
        connectOrCreate: {
          where: { address: clientAddress },
          create: { address: clientAddress, role: "client" },
        },
      },
      milestones: milestones.length
        ? {
            create: milestones.map((amount, index) => ({
              index,
              amount: parseFloat(amount),
              status: "pending",
            })),
          }
        : undefined,
    },
    include: {
      client: true,
      milestones: true,
    },
  });

  // Try to post on blockchain
  try {
    const blockchainResult = await postJobOnChain(title, description, budget);
    // Update database with blockchain ID
    await prisma.job.update({
      where: { id: dbJob.id },
      data: { blockchainId: blockchainResult.jobId },
    });
    return { ...dbJob, blockchainId: blockchainResult.jobId };
  } catch (error) {
    console.error("Failed to post job on blockchain:", error);
    // Return database job even if blockchain fails
    return dbJob;
  }
}

export async function getJobs() {
  // Get jobs from database
  const dbJobs = await prisma.job.findMany({
    where: { status: "open" },
    include: {
      client: { select: { name: true, address: true } },
      milestones: true,
      applications: {
        include: {
          freelancer: { select: { name: true, address: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For jobs with blockchain IDs, try to sync status
  const syncedJobs = await Promise.all(
    dbJobs.map(async (job) => {
      if (job.blockchainId) {
        try {
          const blockchainJob = await getJobOnChain(job.blockchainId);
          // Update database status if different
          if (blockchainJob.status !== job.status) {
            await prisma.job.update({
              where: { id: job.id },
              data: {
                status:
                  blockchainJob.status === 0
                    ? "open"
                    : blockchainJob.status === 1
                    ? "in_progress"
                    : blockchainJob.status === 2
                    ? "completed"
                    : "disputed",
              },
            });
            job.status =
              blockchainJob.status === 0
                ? "open"
                : blockchainJob.status === 1
                ? "in_progress"
                : blockchainJob.status === 2
                ? "completed"
                : "disputed";
          }
        } catch (error) {
          console.error(`Failed to sync job ${job.id} with blockchain:`, error);
        }
      }
      return job;
    }),
  );

  return syncedJobs;
}

export async function getJobById(id) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, address: true } },
      freelancer: { select: { name: true, address: true } },
      milestones: true,
      applications: {
        include: {
          freelancer: { select: { name: true, address: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      disputes: true,
    },
  });

  if (!job) return null;

  // Sync with blockchain if available
  if (job.blockchainId) {
    try {
      const blockchainJob = await getJobOnChain(job.blockchainId);
      if (blockchainJob.status !== job.status) {
        const statusMap = {
          0: "open",
          1: "in_progress",
          2: "completed",
          3: "disputed",
        };
        await prisma.job.update({
          where: { id },
          data: { status: statusMap[blockchainJob.status] || job.status },
        });
        job.status = statusMap[blockchainJob.status] || job.status;
      }
    } catch (error) {
      console.error(`Failed to sync job ${id} with blockchain:`, error);
    }
  }

  return job;
}

export async function applyToJob(
  jobId,
  freelancerAddress,
  proposal,
  proposedRate,
) {
  // Find or create freelancer
  let freelancer = await prisma.user.findUnique({
    where: { address: freelancerAddress },
  });

  if (!freelancer) {
    freelancer = await prisma.user.create({
      data: {
        address: freelancerAddress,
        role: "freelancer",
      },
    });
  }

  // Create application
  const application = await prisma.application.create({
    data: {
      jobId,
      freelancerId: freelancer.id,
      proposal,
      proposedRate: proposedRate ? parseFloat(proposedRate) : null,
    },
    include: {
      freelancer: { select: { name: true, address: true } },
      job: { select: { title: true } },
    },
  });

  return application;
}
