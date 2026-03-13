"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { resolveJobDispute } from "../../lib/disputeResolver";

export default function DisputePage() {
  const account = useActiveAccount();
  const [jobId, setJobId] = useState("");
  const [submission, setSubmission] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!account) {
    return <p>Please connect your wallet first.</p>;
  }

  const handleResolve = async () => {
    setLoading(true);
    try {
      const res = await resolveJobDispute(
        jobId,
        { description: "" },
        submission,
      );
      setResult(res);
      if (res.approved && process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        const { resolveDisputeOnChain } = await import("../../lib/contract");
        await resolveDisputeOnChain(parseInt(jobId), true);
        alert("Dispute approval submitted on-chain");
      }
    } catch (e) {
      console.error(e);
      alert("Dispute resolution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-6">AI Dispute Resolution</h1>
      <div className="max-w-md space-y-4">
        <input
          type="number"
          placeholder="Job ID"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
        />
        <textarea
          placeholder="Freelancer submission text"
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
        />
        <button
          onClick={handleResolve}
          disabled={loading}
          className="bg-yellow-500 px-6 py-3 rounded-lg text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run AI Agent"}
        </button>
        {result && (
          <div className="bg-gray-900 p-4 rounded mt-4">
            <p>
              <strong>Decision:</strong>{" "}
              {result.approved ? "APPROVED" : "REJECTED"}
            </p>
            <p>
              <strong>Reason:</strong> {result.reasoning}
            </p>
            <p>
              <strong>Confidence:</strong> {result.confidence}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
