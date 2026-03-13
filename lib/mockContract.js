// Mock contract for development - replace with real contract calls later
export const mockContract = {
  postJob: async (title, description, budget) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const jobId = Math.floor(Math.random() * 1000) + 1;
    console.log("Mock job created:", { jobId, title, description, budget });

    return {
      jobId,
      status: "OPEN",
      title,
      description,
      budget,
    };
  },

  getJob: async (jobId) => {
    // Mock job data
    return {
      id: jobId,
      title: "Sample Job",
      description: "This is a sample job description",
      budget: 100,
      status: "OPEN",
      client: "0x123...",
      freelancer: null,
    };
  },

  acceptJob: async (jobId) => {
    console.log("Mock job accepted:", jobId);
    return { success: true };
  },

  submitWork: async (jobId) => {
    console.log("Mock work submitted:", jobId);
    return { success: true };
  },

  resolveDispute: async (jobId, approved) => {
    console.log("Mock dispute resolved:", jobId, approved);
    return { success: true };
  },
};
