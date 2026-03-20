"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import Nav from "../Nav";

const DISPUTE_TYPES = [
  { label: "Scope not met", value: "scope_not_met" },
  { label: "Late delivery", value: "late_delivery" },
  { label: "Poor quality", value: "poor_quality" },
  { label: "Payment refusal", value: "payment_refusal" },
  { label: "Other", value: "other" },
];

const EVIDENCE_TYPES = [
  { label: "Screenshot", value: "screenshot" },
  { label: "Figma Design", value: "figma" },
  { label: "Live URL", value: "live_url" },
  { label: "Chat Proof", value: "chat_proof" },
  { label: "GitHub Repo", value: "github_repo" },
  { label: "Other", value: "other" },
];

export default function DisputePage() {
  const account = useActiveAccount();
  const [jobId, setJobId] = useState("");
  const [jobData, setJobData] = useState(null);
  const [loadingJob, setLoadingJob] = useState(false);

  const [disputeType, setDisputeType] = useState("scope_not_met");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [clientClaim, setClientClaim] = useState("");
  const [freelancerClaim, setFreelancerClaim] = useState("");

  const [evidenceRole, setEvidenceRole] = useState("client");
  const [evidenceType, setEvidenceType] = useState("screenshot");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceItems, setEvidenceItems] = useState([]);

  const [appealReason, setAppealReason] = useState("");
  const [appealEvidenceItems, setAppealEvidenceItems] = useState([]);

  const [disputeId, setDisputeId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJobData(null);
      return;
    }
    let cancelled = false;
    async function fetchJob() {
      setLoadingJob(true);
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setJobData(data);
        } else {
          if (!cancelled) setJobData(null);
        }
      } catch (_) {
        if (!cancelled) setJobData(null);
      } finally {
        if (!cancelled) setLoadingJob(false);
      }
    }
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const structuredReason = useMemo(
    () => ({
      type: disputeType,
      details: disputeDetails,
    }),
    [disputeType, disputeDetails],
  );

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

  const handleAddEvidence = (isAppeal = false) => {
    if (!evidenceUri) {
      alert("Please provide an evidence link.");
      return;
    }
    const item = {
      role: evidenceRole,
      type: evidenceType,
      uri: evidenceUri,
      description: evidenceDesc || "",
    };
    if (isAppeal) {
      setAppealEvidenceItems((prev) => [...prev, item]);
    } else {
      setEvidenceItems((prev) => [...prev, item]);
    }
    setEvidenceUri("");
    setEvidenceDesc("");
  };

  const handleCreateDispute = async () => {
    if (!jobId || !disputeDetails) {
      alert("Please enter a job ID and dispute details.");
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
          reason: disputeDetails,
          reasonType: disputeType,
          reasonDetails: disputeDetails,
          evidence: evidenceItems.map((item) => ({
            ...item,
            submittedBy: account.address,
          })),
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

  const handleResolve = async () => {
    if (freelancerClaim.trim().length < 20) {
      alert("Please provide a longer freelancer claim (min 20 chars).");
      return;
    }
    setLoading(true);
    try {
      const disputePayload = {
        job: jobData,
        clientClaim: { ...structuredReason, details: disputeDetails, text: clientClaim },
        freelancerClaim,
        evidence: evidenceItems,
      };

      const aiRes = await fetch("/api/ai-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          disputeId,
          disputePayload,
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
        const onChainId =
          typeof jobData?.blockchainId === "number"
            ? jobData.blockchainId
            : parseInt(jobId);
        await resolveDisputeOnChain(onChainId, res.decision !== "client");
        alert("Dispute decision submitted on-chain");
      }

      if (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY) {
        const { submitReputationOnChain } = await import("../../lib/reputation");
        const freelancerId = jobData?.freelancer?.agentId;
        const clientId = jobData?.client?.agentId;
        const metadata = JSON.stringify({
          jobId,
          decision: res.decision,
          reasoning: res.reasoning,
        });

        if (typeof freelancerId === "number") {
          const rating = res.decision === "client" ? -1 : 1;
          await submitReputationOnChain(freelancerId, rating, metadata);
        }
        if (typeof clientId === "number") {
          const rating = res.decision === "client" ? 1 : 0;
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
        body: JSON.stringify({
          reason: appealReason,
          evidence: appealEvidenceItems.map((item) => ({
            ...item,
            submittedBy: account.address,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || error.error || "Failed to appeal");
      }

      const appealPayload = {
        job: jobData,
        clientClaim: { ...structuredReason, details: disputeDetails, text: clientClaim },
        freelancerClaim,
        evidence: [...evidenceItems, ...appealEvidenceItems],
        previousDecision: result,
        isAppeal: true,
      };

      await fetch("/api/ai-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          disputeId,
          disputePayload: appealPayload,
        }),
      });

      alert("Appeal submitted");
      setAppealReason("");
      setAppealEvidenceItems([]);
    } catch (e) {
      console.error(e);
      alert("Failed to submit appeal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent">
            AI Dispute Resolution
          </h1>
          <div className="space-y-6 bg-gray-800 p-8 rounded-2xl shadow-2xl">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Job ID
              </label>
              <input
                type="text"
                placeholder="Enter the job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
              {loadingJob && (
                <p className="text-sm text-gray-400 mt-2">Fetching job...</p>
              )}
              {jobData && (
                <div className="mt-3 text-sm text-gray-300">
                  <p>
                    <strong>Title:</strong> {jobData.title}
                  </p>
                  <p>
                    <strong>Budget:</strong> {jobData.budget} USDC
                  </p>
                  {jobData.milestones?.length ? (
                    <p>
                      <strong>Milestones:</strong> {jobData.milestones.length}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Dispute Type
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              >
                {DISPUTE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Provide dispute details..."
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors h-24 resize-none"
              />
              <textarea
                placeholder="Client claim (optional)"
                value={clientClaim}
                onChange={(e) => setClientClaim(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors h-20 resize-none"
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
                Evidence
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={evidenceRole}
                  onChange={(e) => setEvidenceRole(e.target.value)}
                  className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
                >
                  <option value="client">Client Evidence</option>
                  <option value="freelancer">Freelancer Evidence</option>
                </select>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
                >
                  {EVIDENCE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Evidence link"
                value={evidenceUri}
                onChange={(e) => setEvidenceUri(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
              <input
                type="text"
                placeholder="Description"
                value={evidenceDesc}
                onChange={(e) => setEvidenceDesc(e.target.value)}
                className="mt-3 w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-yellow-500 focus:outline-none transition-colors"
              />
              <button
                onClick={() => handleAddEvidence(false)}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                Add Evidence
              </button>
              {evidenceItems.length > 0 && (
                <ul className="mt-3 text-sm text-gray-300 space-y-2">
                  {evidenceItems.map((item, idx) => (
                    <li key={`${item.uri}-${idx}`}>
                      [{item.role}] {item.type}: {item.uri}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Freelancer Submission
              </label>
              <textarea
                placeholder="Describe your work and why you deserve payment..."
                value={freelancerClaim}
                onChange={(e) => setFreelancerClaim(e.target.value)}
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
                  <strong className="text-green-400">Winner:</strong>{" "}
                  {result.decision || "partial"}
                </p>
                <p className="mb-2">
                  <strong className="text-blue-400">Reason:</strong>{" "}
                  {result.reasoning}
                </p>
                <p className="mb-2">
                  <strong className="text-purple-400">Confidence:</strong>{" "}
                  {Math.round((result.confidence || 0) * 100)}%
                </p>
                <p>
                  <strong className="text-orange-400">Payment:</strong>{" "}
                  {result.paymentSplit?.freelancer ?? 50}% freelancer /{" "}
                  {result.paymentSplit?.client ?? 50}% client
                </p>
              </div>
            )}

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
                onClick={() => handleAddEvidence(true)}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                Add Appeal Evidence
              </button>
              {appealEvidenceItems.length > 0 && (
                <ul className="mt-3 text-sm text-gray-300 space-y-2">
                  {appealEvidenceItems.map((item, idx) => (
                    <li key={`${item.uri}-${idx}`}>
                      [{item.role}] {item.type}: {item.uri}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={handleAppeal}
                disabled={loading}
                className="mt-3 w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Appeal"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
