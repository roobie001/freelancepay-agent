"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import Nav from "../Nav";
import { useToast } from "../components/ToastProvider";

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

const MOCK_JOBS = [
  {
    id: "mock-job-1",
    title: "Landing page build",
    budget: 200,
    agreement: { id: "mock-contract-1" },
    client: { address: "0xClient" },
    freelancer: { address: "0xFreelancer" },
  },
];

export default function DisputePage() {
  const account = useActiveAccount();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [role, setRole] = useState("client");
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [jobId, setJobId] = useState("");
  const [contractId, setContractId] = useState("");
  const [jobData, setJobData] = useState(null);

  const [disputeType, setDisputeType] = useState("scope_not_met");
  const [details, setDetails] = useState("");
  const [clientClaim, setClientClaim] = useState("");
  const [freelancerClaim, setFreelancerClaim] = useState("");

  const [evidenceRole, setEvidenceRole] = useState("client");
  const [evidenceType, setEvidenceType] = useState("screenshot");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceItems, setEvidenceItems] = useState([]);

  const [disputeId, setDisputeId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [appealReason, setAppealReason] = useState("");
  const [appealEvidenceItems, setAppealEvidenceItems] = useState([]);
  const [canAppeal, setCanAppeal] = useState(false);

  useEffect(() => {
    if (!account?.address) return;
    let cancelled = false;

    async function fetchJobs() {
      setLoadingJobs(true);
      try {
        const [clientRes, freelancerRes] = await Promise.all([
          fetch(`/api/client/jobs?address=${account.address}`),
          fetch(`/api/freelancer/jobs?address=${account.address}`),
        ]);

        let clientJobs = [];
        let freelancerJobs = [];
        if (clientRes.ok) clientJobs = await clientRes.json();
        if (freelancerRes.ok) freelancerJobs = await freelancerRes.json();

        const merged = [...clientJobs, ...freelancerJobs];
        const unique = merged.filter(
          (job, idx, arr) => arr.findIndex((j) => j.id === job.id) === idx,
        );

        if (!cancelled) {
          setJobs(unique.length ? unique : MOCK_JOBS);
          const userRole = clientJobs.length ? "client" : "freelancer";
          setRole(userRole);
          setEvidenceRole(userRole);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setJobs(MOCK_JOBS);
        }
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    }

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [account?.address]);

  useEffect(() => {
    if (!jobId) {
      setJobData(null);
      setContractId("");
      return;
    }
    const selected = jobs.find((job) => job.id === jobId);
    if (selected) {
      setJobData(selected);
      if (selected?.agreement?.id) {
        setContractId(selected.agreement.id);
      }
      return;
    }
    let cancelled = false;
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setJobData(data);
            if (data?.agreement?.id) {
              setContractId(data.agreement.id);
            }
          }
        }
      } catch (_) {
        if (!cancelled) setJobData(null);
      }
    }
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [jobId, jobs]);

  const handleAddEvidence = (isAppeal = false) => {
    if (!evidenceUri) {
      addToast("Please provide evidence or upload a file.", "info");
      return;
    }
    const item = {
      role: evidenceRole,
      type: evidenceType,
      uri: evidenceUri,
      description: evidenceDesc || "",
      timestamp: new Date().toISOString(),
      uploader: account?.address || "unknown",
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
    if (!jobId || !contractId) {
      addToast("Select a job to auto-fill the contract.", "info");
      return;
    }
    if (!details.trim()) {
      addToast("Please enter dispute details.", "info");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          contractId,
          initiatedBy: account.address,
          reason: details,
          reasonType: disputeType,
          reasonDetails: JSON.stringify({
            details,
            clientClaim,
            freelancerClaim,
          }),
          evidence: evidenceItems.map((item) => ({
            ...item,
            submittedBy: account.address,
          })),
          autoResolve: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to create dispute");
      }
      const dispute = await res.json();
      setDisputeId(dispute.id);
      setCanAppeal(false);
      addToast("Dispute created successfully.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to create dispute.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!disputeId) {
      addToast("Create a dispute first.", "info");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "AI dispute failed");
      }
      const data = await res.json();
      setResult(data);
      setCanAppeal(true);
      addToast("AI decision generated.", "success");
    } catch (err) {
      console.error(err);
      addToast("AI dispute failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = async () => {
    if (!disputeId || !appealReason) {
      addToast("Please enter an appeal reason.", "info");
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
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to appeal");
      }
      const data = await res.json();
      if (data?.decision) {
        setResult({
          decision: data.decision.decision,
          confidence: data.decision.confidence,
          reasoning: data.decision.reasoning,
          paymentSplit: data.decision.paymentSplit,
        });
      }
      addToast("Appeal submitted.", "success");
      setAppealReason("");
      setAppealEvidenceItems([]);
    } catch (err) {
      console.error(err);
      addToast("Appeal failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = useMemo(
    () => (role === "client" ? "Client" : "Freelancer"),
    [role],
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

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-green-400">
              Dispute Resolution
            </h1>
            <p className="text-gray-400 mt-2">
              Logged in as {roleLabel}. Open a dispute and let the AI judge.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1 text-sm text-green-300">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              AI Judge: Active • Disputes resolved automatically on-chain
            </div>
          </header>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Dispute Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Job ID
                </label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title || job.id}
                    </option>
                  ))}
                </select>
                {loadingJobs && (
                  <p className="text-xs text-gray-500 mt-1">Loading jobs...</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Contract ID
                </label>
                <input
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  placeholder="Auto-filled from job"
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Dispute Type
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
              >
                {DISPUTE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the issue in detail"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 h-28"
            />
            <textarea
              value={clientClaim}
              onChange={(e) => setClientClaim(e.target.value)}
              placeholder="Client claim"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 h-24"
            />
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Evidence Submission</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={evidenceRole}
                onChange={(e) => setEvidenceRole(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
              >
                <option value="client">Client Evidence</option>
                <option value="freelancer">Freelancer Evidence</option>
              </select>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
              >
                {EVIDENCE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                type="file"
                className="text-sm text-gray-300"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const data = new FormData();
                    data.append("file", file);
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: data,
                    });
                    const json = await res.json();
                    if (res.ok) {
                      setEvidenceUri(json.ipfs || json.gateway);
                      addToast("Evidence uploaded.", "success");
                    } else {
                      addToast(json.error || "Upload failed.", "error");
                    }
                  } catch (err) {
                    console.error(err);
                    addToast("Upload failed.", "error");
                  }
                }}
              />
            </div>
            <input
              value={evidenceUri}
              onChange={(e) => setEvidenceUri(e.target.value)}
              placeholder="Evidence link"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            />
            <input
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              placeholder="Description"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={() => handleAddEvidence(false)}
              className="px-4 py-2 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-600"
            >
              Add Evidence
            </button>
            {evidenceItems.length > 0 && (
              <ul className="text-sm text-gray-300 space-y-1">
                {evidenceItems.map((item, idx) => (
                  <li key={`${item.uri}-${idx}`}>
                    [{item.role}] {item.type}: {item.uri}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Freelancer Submission</h2>
            <textarea
              value={freelancerClaim}
              onChange={(e) => setFreelancerClaim(e.target.value)}
              placeholder="Describe work done and why payment is deserved"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 h-28"
            />
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">AI Agent</h2>
            <button
              onClick={handleCreateDispute}
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create Dispute"}
            </button>
            <button
              onClick={handleResolve}
              disabled={loading}
              className="w-full md:w-auto ml-0 md:ml-3 px-6 py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Running..." : "Run AI Agent"}
            </button>
            {result && (
              <div className="bg-black/40 border border-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-400">AI Decision</p>
                <p className="text-lg text-green-400">{result.decision}</p>
                <p className="text-sm text-gray-300 mt-1">{result.reasoning}</p>
                <p className="text-sm text-gray-300 mt-1">
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Split: {result.paymentSplit?.freelancer ?? 50}% freelancer /{" "}
                  {result.paymentSplit?.clientRefund ?? 50}% client
                </p>
              </div>
            )}
          </section>

          {canAppeal && (
            <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-2xl font-semibold">Appeal</h2>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explain why this should be appealed"
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 h-24"
              />
              <button
                onClick={() => handleAddEvidence(true)}
                className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600"
              >
                Add Appeal Evidence
              </button>
              {appealEvidenceItems.length > 0 && (
                <ul className="text-sm text-gray-300 space-y-1">
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
                className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-semibold hover:bg-yellow-600 disabled:opacity-50"
              >
                Submit Appeal
              </button>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
