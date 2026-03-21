"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import Nav from "../Nav";

export default function ClientDashboard() {
  const account = useActiveAccount();
  const [jobs, setJobs] = useState([]);
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    async function loadJobs() {
      if (!account?.address) return;
      try {
        const res = await fetch(
          `/api/client/jobs?address=${account.address}`,
        );
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        } else {
          console.error("Failed to fetch client jobs");
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (account) loadJobs();
  }, [account]);

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

  const getStatusText = (status) => {
    if (typeof status === "string") return status.toUpperCase();
    const statuses = [
      "OPEN",
      "IN_PROGRESS",
      "SUBMITTED",
      "APPROVED",
      "DISPUTED",
      "COMPLETED",
    ];
    return statuses[status] || "UNKNOWN";
  };

  const handleApproveMilestone = async (jobId) => {
    try {
      const { approveMilestoneOnChain } = await import("../../lib/contract");
      await approveMilestoneOnChain(jobId);
      alert("Milestone approved on-chain!");
      // Refresh
      const contract = await import("../../lib/contract");
      const job = await contract.getJobOnChain(jobId);
      const count = await contract.getMilestoneCountOnChain(jobId);
      const milestones = await Promise.all(
        Array.from({ length: count }, (_, idx) =>
          contract.getMilestoneOnChain(jobId, idx),
        ),
      );
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...job, id: jobId, milestones } : j)),
      );
    } catch (e) {
      console.error(e);
      alert("Failed to approve milestone");
    }
  };

  const handleMarkMilestonePaid = async (jobId, index) => {
    try {
      await fetch("/api/milestones/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, index }),
      });

      const refreshed = await fetch(
        `/api/client/jobs?address=${account.address}`,
      );
      if (refreshed.ok) {
        setJobs(await refreshed.json());
      }
    } catch (e) {
      console.error(e);
      alert("Failed to mark milestone paid");
    }
  };

  const handleAcceptApplication = async (applicationId, blockchainId) => {
    try {
      setAcceptingId(applicationId);
      const res = await fetch(`/api/applications/${applicationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientAddress: account.address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to accept application");
      }

      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS && blockchainId) {
        const { acceptProposalOnChain } = await import("../../lib/contract");
        await acceptProposalOnChain(blockchainId);
      }

      alert("Application accepted!");
      // refresh
      const refreshed = await fetch(
        `/api/client/jobs?address=${account.address}`,
      );
      if (refreshed.ok) {
        setJobs(await refreshed.json());
      }
    } catch (e) {
      console.error(e);
      alert("Failed to accept application");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Client Dashboard
          </h1>
          <div className="space-y-6">
            {jobs.length === 0 ? (
              <p className="text-center text-gray-400">No jobs posted yet.</p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-gray-800 p-6 rounded-2xl shadow-2xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-semibold text-blue-400">
                      {job.title}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        job.status === 0
                          ? "bg-green-600"
                          : job.status === 1
                          ? "bg-yellow-600"
                          : job.status === 2
                          ? "bg-purple-600"
                          : job.status === 3
                          ? "bg-blue-600"
                          : job.status === 4
                          ? "bg-red-600"
                          : "bg-gray-600"
                      }`}
                    >
                      {getStatusText(job.status)}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{job.description}</p>
                  <p className="text-yellow-400 font-semibold">
                    Budget: {job.budget} USDC
                  </p>
                  {job.milestones && job.milestones.length > 0 && (
                    <div className="mt-3 text-sm text-gray-300">
                      {job.milestones.map((m, idx) => (
                        <div
                          key={`${job.id}-${idx}`}
                          className="flex items-center justify-between border-b border-gray-700 py-2"
                        >
                          <span>
                            Milestone {idx + 1}: {m.amount} USDC
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {m.status ||
                                (m.released
                                  ? "paid"
                                  : m.submitted
                                  ? "submitted"
                                  : "pending")}
                            </span>
                            {m.status === "submitted" && (
                              <button
                                className="text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                onClick={() =>
                                  handleMarkMilestonePaid(job.id, m.index)
                                }
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {job.applications && job.applications.length > 0 && (
                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <p className="text-sm text-blue-300 mb-2 font-semibold">
                        Applications ({job.applications.length})
                      </p>
                      <div className="space-y-3">
                        {job.applications.map((app) => (
                          <div
                            key={app.id}
                            className="rounded-xl border border-gray-700 bg-gray-900 p-3"
                          >
                            {app.status === "accepted" && (
                              <div className="mb-2 inline-block rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-300">
                                Accepted
                              </div>
                            )}
                            <p className="text-sm text-gray-300">
                              Freelancer:{" "}
                              {app.freelancer?.name ||
                                `${app.freelancer?.address?.slice(0, 6)}...${app.freelancer?.address?.slice(-4)}`}
                            </p>
                            {app.coverLetter && (
                              <p className="text-sm text-gray-400 mt-2">
                                {app.coverLetter.slice(0, 140)}...
                              </p>
                            )}
                            <div className="mt-2 text-xs text-gray-500 flex gap-3">
                              {app.bidAmount && (
                                <span>Bid: {app.bidAmount} USDC</span>
                              )}
                              {app.timelineDays && (
                                <span>Timeline: {app.timelineDays} days</span>
                              )}
                            </div>
                            <button
                              className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-4 py-2 rounded-lg"
                              onClick={() =>
                                setExpandedAppId(
                                  expandedAppId === app.id ? null : app.id,
                                )
                              }
                            >
                              {expandedAppId === app.id
                                ? "Hide Details"
                                : "View Proposal Details"}
                            </button>
                            {expandedAppId === app.id && (
                              <div className="mt-3 text-sm text-gray-300 space-y-2">
                                {app.coverLetter && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      Cover Letter
                                    </p>
                                    <p className="text-gray-200 whitespace-pre-wrap">
                                      {app.coverLetter}
                                    </p>
                                  </div>
                                )}
                                {app.deliverables && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      Deliverables
                                    </p>
                                    <p className="text-gray-200 whitespace-pre-wrap">
                                      {app.deliverables}
                                    </p>
                                  </div>
                                )}
                                {app.milestones && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      Milestones
                                    </p>
                                    <div className="space-y-2">
                                      {app.milestones.map((m, idx) => (
                                        <div
                                          key={`${app.id}-ms-${idx}`}
                                          className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2"
                                        >
                                          <span>
                                            {m.title || `Milestone ${idx + 1}`}
                                          </span>
                                          <span className="text-gray-400">
                                            {m.amount} USDC • {m.duration} days
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {app.portfolioLink && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      Portfolio
                                    </p>
                                    <a
                                      href={app.portfolioLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-400 underline"
                                    >
                                      {app.portfolioLink}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                            {app.status === "pending" && (
                              <button
                                className="mt-3 w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:from-gray-500 disabled:to-gray-600"
                                onClick={() =>
                                  handleAcceptApplication(
                                    app.id,
                                    job.blockchainId,
                                  )
                                }
                                disabled={acceptingId === app.id}
                              >
                                {acceptingId === app.id
                                  ? "Accepting..."
                                  : "Accept Proposal"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.status === 4 && ( // DISPUTED
                    <button
                      className="mt-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold"
                      onClick={() => {
                        // Refund logic
                        alert("Refund initiated");
                      }}
                    >
                      Refund Escrow
                    </button>
                  )}
                  {job.status === 2 && ( // SUBMITTED
                    <button
                      className="mt-4 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-semibold"
                      onClick={() => handleApproveMilestone(job.id)}
                    >
                      Approve Milestone
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
