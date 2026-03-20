"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import Nav from "../Nav";

export default function DisputePage() {
  const account = useActiveAccount();
  const [jobId, setJobId] = useState("");
  const [submission, setSubmission] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceRole, setEvidenceRole] = useState("freelancer");
  const [appealReason, setAppealReason] = useState("");
  const [disputeId, setDisputeId] = useState("");
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

  const handleCreateDispute = async () => {
    if (!jobId || !disputeReason) {
      alert("Please enter a job ID and dispute reason.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          initiatedBy: account.address,
          reason: disputeReason,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || error.error || "Failed to create dispute");
      }
      const dispute = await res.json();
      setDisputeId(dispute.id);
      alert(`Dispute created: ${dispute.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create dispute");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!disputeId || !evidenceUri) {
      alert("Please create a dispute and provide evidence URI.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedBy: account.address,
          role: evidenceRole,
          uri: evidenceUri,
          description: evidenceDesc || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || error.error || "Failed to add evidence");
      }
      alert("Evidence submitted");
      setEvidenceUri("");
      setEvidenceDesc("");
    } catch (e) {
      console.error(e);
      alert("Failed to add evidence");
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = async () => {
    if (!disputeId || !appealReason) {
      alert("Please enter an appeal reason.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: appealReason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || error.error || "Failed to appeal");
      }
      alert("Appeal submitted");
      setAppealReason("");
    } catch (e) {
      console.error(e);
      alert("Failed to submit appeal");
    } finally {
      setLoading(false);
    }
  };

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

      const aiRes = await fetch("/api/ai-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          jobData,
          submissionData: submission,
        }),
      });
      if (!aiRes.ok) {
        const err = await aiRes.json();
        throw new Error(err.detail || err.error || "AI dispute failed");
      }
      const res = await aiRes.json();
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

      if (disputeId) {
        await fetch(`/api/disputes/${disputeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiDecision: res.reasoning,
            resolved: true,
            status: "resolved",
          }),
        });
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
                Dispute Reason
              </label>
              <textarea
                placeholder="Why is this in dispute?"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors h-24 resize-none"
              />
              <button
                onClick={handleCreateDispute}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Dispute"}
              </button>
              {disputeId && (
                <p className="text-sm text-green-400 mt-2">
                  Dispute ID: {disputeId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Evidence URI
              </label>
              <input
                type="text"
                placeholder="ipfs://... or https://..."
                value={evidenceUri}
                onChange={(e) => setEvidenceUri(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
              <select
                value={evidenceRole}
                onChange={(e) => setEvidenceRole(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              >
                <option value="freelancer">Freelancer Evidence</option>
                <option value="client">Client Evidence</option>
              </select>
              <input
                type="text"
                placeholder="Short description (optional)"
                value={evidenceDesc}
                onChange={(e) => setEvidenceDesc(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleAddEvidence}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Evidence"}
              </button>
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
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Appeal Reason
              </label>
              <textarea
                placeholder="Explain why this dispute should be appealed..."
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors h-24 resize-none"
              />
              <button
                onClick={handleAppeal}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Appeal"}
              </button>
            </div>
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
