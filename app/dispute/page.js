"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { resolveJobDispute } from "../../lib/disputeResolver";
import Nav from "../Nav";

export default function DisputePage() {
  const account = useActiveAccount();
  const [jobId, setJobId] = useState("");
  const [submission, setSubmission] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!account) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center p-8">
          <p className="text-gray-400 text-xl">
            Please connect your wallet first.
          </p>
        </main>
      </>
    );
  }

  const handleResolve = async () => {
    setLoading(true);
    try {
      let jobData = { description: "" };
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (jobRes.ok) {
          jobData = await jobRes.json();
        }
      } catch (e) {
        console.warn("Failed to fetch job details, using empty description.");
      }

      const res = await resolveJobDispute(
        jobId,
        jobData,
        submission,
      );
      setResult(res);
      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        const { resolveDisputeOnChain } = await import("../../lib/contract");
        await resolveDisputeOnChain(parseInt(jobId), !!res.approved);
        alert("Dispute decision submitted on-chain");
      }

      if (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY) {
        const { submitReputationOnChain } = await import("../../lib/reputation");
        const freelancerId = jobData?.freelancer?.agentId;
        const clientId = jobData?.client?.agentId;
        const metadata = JSON.stringify({
          jobId,
          approved: !!res.approved,
          reason: res.reasoning,
        });

        if (typeof freelancerId === "number") {
          const rating = res.approved ? 1 : -1;
          await submitReputationOnChain(freelancerId, rating, metadata);
        }
        if (typeof clientId === "number") {
          const rating = res.approved ? 0 : 1;
          await submitReputationOnChain(clientId, rating, metadata);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Dispute resolution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent">
            AI Dispute Resolution
          </h1>
          <div className="space-y-6 bg-gray-800 p-8 rounded-2xl shadow-2xl">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Job ID
              </label>
              <input
                type="number"
                placeholder="Enter the job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Freelancer Submission
              </label>
              <textarea
                placeholder="Describe your work and why you deserve payment..."
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors h-32 resize-none"
              />
            </div>
            <button
              onClick={handleResolve}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 px-8 py-4 rounded-xl text-black font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing with AI..." : "Run AI Agent"}
            </button>
            {result && (
              <div className="bg-gray-900 p-6 rounded-xl border-l-4 border-yellow-500">
                <h3 className="text-xl font-semibold mb-4 text-yellow-400">
                  AI Decision
                </h3>
                <p className="mb-2">
                  <strong className="text-green-400">Decision:</strong>{" "}
                  <span
                    className={
                      result.approved ? "text-green-400" : "text-red-400"
                    }
                  >
                    {result.approved ? "APPROVED" : "REJECTED"}
                  </span>
                </p>
                <p className="mb-2">
                  <strong className="text-blue-400">Reason:</strong>{" "}
                  {result.reasoning}
                </p>
                <p>
                  <strong className="text-purple-400">Confidence:</strong>{" "}
                  {result.confidence}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
