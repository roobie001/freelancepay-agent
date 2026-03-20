import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create sample users
  const client1 = await prisma.user.upsert({
    where: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
    update: {},
    create: {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      name: "Alice Johnson",
      role: "client",
    },
  });

  const client2 = await prisma.user.upsert({
    where: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44f" },
    update: {},
    create: {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44f",
      name: "Bob Smith",
      role: "client",
    },
  });

  const freelancer1 = await prisma.user.upsert({
    where: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f450" },
    update: {},
    create: {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f450",
      name: "Charlie Developer",
      role: "freelancer",
    },
  });

  const freelancer2 = await prisma.user.upsert({
    where: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f451" },
    update: {},
    create: {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f451",
      name: "Diana Designer",
      role: "freelancer",
    },
  });

  // Create sample jobs
  const job1 = await prisma.job.upsert({
    where: { id: "sample-job-1" },
    update: {},
    create: {
      id: "sample-job-1",
      title: "Build a React E-commerce Website",
      description:
        "Need a modern e-commerce website built with React, Next.js, and Stripe integration. Should include product catalog, shopping cart, user authentication, and admin dashboard.",
      budget: 2500,
      clientId: client1.id,
      blockchainId: 1,
    },
  });

  const job2 = await prisma.job.upsert({
    where: { id: "sample-job-2" },
    update: {},
    create: {
      id: "sample-job-2",
      title: "Smart Contract Audit & Optimization",
      description:
        "Looking for an experienced Solidity developer to audit and optimize our DeFi smart contracts. Focus on gas efficiency and security best practices.",
      budget: 1500,
      clientId: client2.id,
      blockchainId: 2,
    },
  });

  const job3 = await prisma.job.upsert({
    where: { id: "sample-job-3" },
    update: {},
    create: {
      id: "sample-job-3",
      title: "UI/UX Design for Mobile App",
      description:
        "Create beautiful and intuitive UI/UX designs for a fitness tracking mobile app. Include user flows, wireframes, and high-fidelity mockups.",
      budget: 800,
      clientId: client1.id,
    },
  });

  // Create sample applications
  await prisma.application.upsert({
    where: {
      jobId_freelancerId: {
        jobId: job1.id,
        freelancerId: freelancer1.id,
      },
    },
    update: {},
    create: {
      jobId: job1.id,
      freelancerId: freelancer1.id,
      proposal:
        "I have 5+ years of experience building e-commerce platforms with React and Next.js. I can deliver a high-quality solution within 4 weeks.",
      proposedRate: 2200,
    },
  });

  await prisma.application.upsert({
    where: {
      jobId_freelancerId: {
        jobId: job2.id,
        freelancerId: freelancer1.id,
      },
    },
    update: {},
    create: {
      jobId: job2.id,
      freelancerId: freelancer1.id,
      proposal:
        "As a certified smart contract auditor, I can provide comprehensive security analysis and optimization recommendations for your DeFi contracts.",
      proposedRate: 1400,
    },
  });

  await prisma.application.upsert({
    where: {
      jobId_freelancerId: {
        jobId: job3.id,
        freelancerId: freelancer2.id,
      },
    },
    update: {},
    create: {
      jobId: job3.id,
      freelancerId: freelancer2.id,
      proposal:
        "With 6 years of UI/UX experience, I specialize in mobile app design. I can create engaging designs that improve user engagement.",
      proposedRate: 750,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
