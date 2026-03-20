// Mock contract for development - replace with real contract calls later
let mockJobs = [
  {
    id: 1,
    title: "Build a website",
    description: "Need a React site",
    budget: 500,
    status: 0, // OPEN
    client: "0x123...",
    freelancer: null,
  },
  {
    id: 2,
    title: "Write smart contract",
    description: "Solidity escrow",
    budget: 1000,
    status: 0, // OPEN
    client: "0x456...",
    freelancer: null,
  },
];

export const mockContract = {
  postJob: async (title, description, budget) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const jobId = mockJobs.length + 1;
    const newJob = {
      id: jobId,
      title,
      description,
      budget: parseInt(budget),
      status: 0, // OPEN
      client: "mock-client",
      freelancer: null,
    };
    mockJobs.push(newJob);
    console.log("Mock job created:", newJob);

    return {
      jobId,
    };
  },

  getJob: async (jobId) => {
    const job = mockJobs.find((j) => j.id === jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    return job;
  },

  acceptJob: async (jobId) => {
    const job = mockJobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");
    if (job.status !== 0) throw new Error("Job not available");
    job.status = 1; // IN_PROGRESS
    job.freelancer = "mock-freelancer";
    console.log("Mock job accepted:", jobId);
    return { success: true };
  },

  submitWork: async (jobId) => {
    const job = mockJobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");
    if (job.status !== 1) throw new Error("Job not in progress");
    job.status = 2; // SUBMITTED
    console.log("Mock work submitted:", jobId);
    return { success: true };
  },

  resolveDispute: async (jobId, approved) => {
    const job = mockJobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");
    job.status = approved ? 3 : 4; // APPROVED or DISPUTED
    console.log("Mock dispute resolved:", jobId, approved);
    return { success: true };
  },
};
