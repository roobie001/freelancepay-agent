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
 * OpenClaw judge agent (HTTP adapter)
 * Expects a JSON response with { approved, reasoning, confidence }
 */
export class OpenClawAgent {
  constructor({ apiUrl, apiKey } = {}) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async resolveDispute(jobId, jobData, submissionData) {
    if (!this.apiUrl) {
      throw new Error("OpenClaw API URL is not configured.");
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        jobId,
        job: jobData,
        submission: submissionData,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenClaw error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return {
      jobId,
      approved: !!data.approved,
      reasoning: data.reasoning || "No reasoning provided",
      confidence:
        typeof data.confidence === "number" ? data.confidence : 0.5,
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
