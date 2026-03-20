import OpenAI from "openai";

/**
 * Real AI agent using OpenAI
 */
export class FreelanceAIAgent {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async resolveDispute(jobId, jobData, submissionData) {
    const prompt =
      jobData?.prompt ||
      `Job requirements:\n${jobData.description}\n\nSubmission:\n${submissionData}\n\nIs the submission satisfactory? Answer with APPROVED or REJECTED and provide a brief reason.`;
    const payloadText = jobData?.disputePayload
      ? `\n\nDispute payload:\n${JSON.stringify(jobData.disputePayload, null, 2)}`
      : "";

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `${prompt}${payloadText}` }],
      max_tokens: 150,
    });

    const text = response.choices[0].message.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      parsed = null;
    }
    const approved =
      parsed?.decision === "freelancer" ||
      parsed?.decision === "partial" ||
      text.toLowerCase().includes("approved");
    return {
      jobId,
      approved,
      decision: parsed?.decision || (approved ? "freelancer" : "client"),
      reasoning: parsed?.reasoning || text,
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : approved ? 0.9 : 0.1,
      paymentSplit: parsed?.paymentSplit || { freelancer: approved ? 100 : 0, client: approved ? 0 : 100 },
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
        prompt: jobData?.prompt,
        disputePayload: jobData?.disputePayload,
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
      approved:
        data.decision === "freelancer" ||
        data.decision === "partial" ||
        !!data.approved,
      decision: data.decision || (data.approved ? "freelancer" : "client"),
      reasoning: data.reasoning || "No reasoning provided",
      confidence:
        typeof data.confidence === "number" ? data.confidence : 0.5,
      paymentSplit: data.paymentSplit || { freelancer: 50, client: 50 },
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
      decision: "freelancer",
      reasoning: "Automatically approved (mock)",
      confidence: 1,
      paymentSplit: { freelancer: 100, client: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}
