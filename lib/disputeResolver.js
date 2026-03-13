import { FreelanceAIAgent, MockAIAgent } from "./aiAgent";

// Choose which agent to use
const USE_REAL_AI = process.env.NEXT_PUBLIC_USE_REAL_AI === "true";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const aiAgent =
  USE_REAL_AI && OPENAI_API_KEY
    ? new FreelanceAIAgent(OPENAI_API_KEY)
    : new MockAIAgent();

// Dispute resolution function
export async function resolveJobDispute(jobId, jobData, submissionData) {
  try {
    console.log(`AI Agent analyzing dispute for job ${jobId}...`);

    const result = await aiAgent.resolveDispute(jobId, jobData, submissionData);

    console.log(`✅ AI Decision: ${result.approved ? "APPROVED" : "REJECTED"}`);
    console.log(`📊 Confidence: ${result.confidence}%`);
    console.log(`💬 Reasoning: ${result.reasoning}`);

    return result;
  } catch (error) {
    console.error("❌ AI dispute resolution failed:", error);
    return {
      jobId,
      approved: false,
      reasoning: "AI analysis failed - manual review required",
      confidence: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
