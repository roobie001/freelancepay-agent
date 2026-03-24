"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import Nav from "../Nav";
import { useToast } from "../components/ToastProvider";

const FILTERS = ["all", "pending", "resolved", "executed"];

const MOCK_DISPUTES = [
  {
    id: "mock-1",
    status: "open",
    job: { title: "Landing page build", client: { address: "0xClient" }, freelancer: { address: "0xFree" } },
    evidence: [{ role: "client", type: "screenshot", uri: "https://example.com/evidence.png" }],
    decisions: [],
    agreementId: "agreement-1",
    createdAt: new Date().toISOString(),
  },
];

const EVIDENCE_TYPES = [
  { label: "Screenshot", value: "screenshot" },
  { label: "Figma Design", value: "figma" },
  { label: "Live URL", value: "live_url" },
  { label: "Chat Proof", value: "chat_proof" },
  { label: "GitHub Repo", value: "github_repo" },
  { label: "Other", value: "other" },
];

function getLatestDecision(dispute) {
  if (!dispute?.decisions?.length) return null;
  const sorted = [...dispute.decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted[0];
}

function getExplorerTxUrl(txHash) {
  if (!txHash) return null;
  return `https://celo-sepolia.blockscout.com/tx/${txHash}`;
}

export default function DisputesDashboardPage() {
  const account = useActiveAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [appealTarget, setAppealTarget] = useState(null);

  const [appealReason, setAppealReason] = useState("");
  const [evidenceRole, setEvidenceRole] = useState("client");
  const [evidenceType, setEvidenceType] = useState("screenshot");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [appealEvidence, setAppealEvidence] = useState([]);

  const role = useMemo(() => {
    if (!account?.address || !selected?.job) return null;
    if (
      selected.job.client?.address?.toLowerCase() ===
      account.address.toLowerCase()
    ) {
      return "client";
    }
    if (
      selected.job.freelancer?.address?.toLowerCase() ===
      account.address.toLowerCase()
    ) {
      return "freelancer";
    }
    return null;
  }, [account?.address, selected?.job]);

  const filteredDisputes = useMemo(() => {
    if (filter === "pending") {
      return disputes.filter((d) => d.status === "open" || d.status === "appealed");
    }
    if (filter === "resolved") {
      return disputes.filter((d) => d.status === "resolved");
    }
    if (filter === "executed") {
      return disputes.filter(
        (d) => getLatestDecision(d)?.executedOnChain,
      );
    }
    return disputes;
  }, [disputes, filter]);

  useEffect(() => {
    if (!account?.address) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/disputes?address=${account.address}`);
        if (!res.ok) throw new Error("Failed to fetch disputes");
        const data = await res.json();
        if (!cancelled) setDisputes(data?.length ? data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setDisputes(MOCK_DISPUTES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [account?.address]);

  const handleResolve = async (dispute) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${dispute.id}/resolve`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Resolve failed");
      }
      await res.json();
      const refreshed = await fetch(`/api/disputes?address=${account.address}`);
      const data = await refreshed.json();
      setDisputes(data);
      addToast("Dispute resolved and payout initiated.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to resolve dispute.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAppealSubmit = async () => {
    if (!appealTarget) return;
    if (!appealReason.trim()) {
      addToast("Please enter an appeal reason.", "info");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${appealTarget.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: appealReason,
          evidence: appealEvidence.map((item) => ({
            ...item,
            submittedBy: account.address,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Appeal failed");
      }
      await res.json();
      const refreshed = await fetch(`/api/disputes?address=${account.address}`);
      const data = await refreshed.json();
      setDisputes(data);
      addToast("Appeal submitted.", "success");
      setAppealTarget(null);
      setAppealReason("");
      setAppealEvidence([]);
    } catch (err) {
      console.error(err);
      addToast("Failed to submit appeal.", "error");
    } finally {
      setLoading(false);
    }
  };

  const addAppealEvidence = () => {
    if (!evidenceUri) {
      addToast("Add an evidence link first.", "info");
      return;
    }
    setAppealEvidence((prev) => [
      ...prev,
      { role: evidenceRole, type: evidenceType, uri: evidenceUri, description: evidenceDesc },
    ]);
    setEvidenceUri("");
    setEvidenceDesc("");
  };

  if (!account) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-gray-400 text-lg">Connect your wallet to view disputes.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold">Dispute Dashboard</h1>
              <p className="text-gray-400 mt-2">
                Track AI decisions, evidence, and escrow payouts in one place.
              </p>
            </div>
            <div className="flex gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    filter === item
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {loading && (
              <div className="text-gray-400">Loading disputes...</div>
            )}
            {!loading && filteredDisputes.length === 0 && (
              <div className="text-gray-400">No disputes found.</div>
            )}
            {filteredDisputes.map((dispute) => {
              const decision = getLatestDecision(dispute);
              const counterparty =
                dispute.job?.client?.address?.toLowerCase() ===
                account.address.toLowerCase()
                  ? dispute.job?.freelancer?.address
                  : dispute.job?.client?.address;
              const isClient =
                dispute.job?.client?.address?.toLowerCase() ===
                account.address.toLowerCase();
              const payoutExecuted = !!decision?.executedOnChain;
              const txUrl = getExplorerTxUrl(decision?.txHash);

              return (
                <div
                  key={dispute.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div>
                    <h3 className="text-xl font-semibold">
                      {dispute.job?.title || "Untitled Job"}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Counterparty:{" "}
                      <span className="text-gray-200">
                        {counterparty || "Unknown"}
                      </span>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Evidence:{" "}
                      {dispute.evidence?.length
                        ? `${dispute.evidence.length} item(s)`
                        : "None"}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      AI Decision:{" "}
                      <span className="text-gray-200">
                        {decision?.decision || "Pending"}
                      </span>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Payout:{" "}
                      <span className="text-gray-200">
                        {payoutExecuted ? "Executed" : "Not executed"}
                      </span>
                    </p>
                    {txUrl ? (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400 text-sm mt-1 inline-block"
                      >
                        View Tx
                      </a>
                    ) : (
                      <p className="text-gray-500 text-sm mt-1">TxHash: —</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setSelected(dispute)}
                      className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleResolve(dispute)}
                      disabled={
                        loading ||
                        !isClient ||
                        dispute.status === "resolved" ||
                        dispute.status === "closed"
                      }
                      className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black text-sm font-semibold disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => setAppealTarget(dispute)}
                      disabled={loading || dispute.status !== "resolved"}
                      className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-semibold disabled:opacity-50"
                    >
                      Appeal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl p-6 overflow-y-auto max-h-[80vh]"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Dispute Details</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Job</p>
                <p className="text-lg">{selected.job?.title || "Untitled"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Evidence</p>
                <ul className="mt-2 space-y-2">
                  {(selected.evidence || []).map((item) => (
                    <li
                      key={item.id || `${item.uri}-${item.type}`}
                      className="text-sm text-gray-200"
                    >
                      [{item.role}] {item.type}:{" "}
                      <a
                        href={item.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400"
                      >
                        {item.uri}
                      </a>
                      {item.description ? ` — ${item.description}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm text-gray-400">AI Decision</p>
                {getLatestDecision(selected) ? (
                  <div className="text-sm text-gray-200 mt-2 space-y-1">
                    <p>Decision: {getLatestDecision(selected).decision}</p>
                    <p>
                      Confidence:{" "}
                      {Math.round(getLatestDecision(selected).confidence * 100)}%
                    </p>
                    <p>Reasoning: {getLatestDecision(selected).reasoning}</p>
                    <p>
                      Split:{" "}
                      {getLatestDecision(selected).paymentSplit?.freelancer ??
                        50}
                      % freelancer /{" "}
                      {getLatestDecision(selected).paymentSplit?.clientRefund ??
                        50}
                      % client
                    </p>
                    <p>
                      Payout:{" "}
                      {getLatestDecision(selected).executedOnChain
                        ? "Executed"
                        : "Not executed"}
                    </p>
                    {getLatestDecision(selected).txHash ? (
                      <a
                        href={getExplorerTxUrl(
                          getLatestDecision(selected).txHash,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400"
                      >
                        View Tx
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">Pending</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {appealTarget && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-50"
          onClick={() => setAppealTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6"
          >
            <h2 className="text-2xl font-bold mb-4">Appeal Dispute</h2>
            <textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why this dispute should be appealed"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 text-sm text-white"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <select
                value={evidenceRole}
                onChange={(e) => setEvidenceRole(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 text-sm text-white"
              >
                <option value="client">Client Evidence</option>
                <option value="freelancer">Freelancer Evidence</option>
              </select>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 text-sm text-white"
              >
                {EVIDENCE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={evidenceUri}
              onChange={(e) => setEvidenceUri(e.target.value)}
              placeholder="Evidence link"
              className="w-full mt-3 p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 text-sm text-white"
            />
            <input
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full mt-3 p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 text-sm text-white"
            />
            <button
              onClick={addAppealEvidence}
              className="mt-3 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm"
            >
              Add Evidence
            </button>
            {appealEvidence.length > 0 && (
              <ul className="mt-3 text-sm text-gray-300 space-y-1">
                {appealEvidence.map((item, idx) => (
                  <li key={`${item.uri}-${idx}`}>
                    [{item.role}] {item.type}: {item.uri}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setAppealTarget(null)}
                className="px-4 py-2 rounded-xl bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAppealSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-green-500 text-black font-semibold disabled:opacity-50"
              >
                Submit Appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
