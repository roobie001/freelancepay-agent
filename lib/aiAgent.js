import OpenAI from "openai";

/**
 * Real AI agent using OpenAI
 */
export class FreelanceAIAgent {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async resolveDispute(jobId, jobData, submissionData) {
    // Very simple prompt: compare description to submission
    const prompt = `Job requirements:\n${jobData.description}\n\nSubmission:\n${submissionData}\n\nIs the submission satisfactory? Answer with APPROVED or REJECTED and provide a brief reason.`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    const text = response.choices[0].message.content || "";
    const approved = text.toLowerCase().includes("approved");
    return {
      jobId,
      approved,
      reasoning: text,
      confidence: approved ? 0.9 : 0.1,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Mock agent for local dev
 */
export class MockAIAgent {
  async resolveDispute(jobId, jobData, submissionData) {
    // always approve after a short delay
    await new Promise((r) => setTimeout(r, 500));
    return {
      jobId,
      approved: true,
      reasoning: "Automatically approved (mock)",
      confidence: 1,
      timestamp: new Date().toISOString(),
    };
  }
}
