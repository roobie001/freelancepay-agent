"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import Nav from "../Nav";

export default function ClientDashboard() {
  const account = useActiveAccount();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function loadJobs() {
      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        // Load from contract
        try {
          const contract = await import("../../lib/contract");
          const jobIds = await contract.getClientJobsOnChain(account?.address);
          const jobDetails = await Promise.all(
            jobIds.map(async (id) => {
              const job = await contract.getJobOnChain(id);
              const count = await contract.getMilestoneCountOnChain(id);
              const milestones = await Promise.all(
                Array.from({ length: count }, (_, idx) =>
                  contract.getMilestoneOnChain(id, idx),
                ),
              );
              return { ...job, id, milestones };
            }),
          );
          setJobs(jobDetails);
        } catch (e) {
          console.error(e);
        }
      } else {
        // Mock jobs
        setJobs([
          {
            id: 1,
            title: "Build a website",
            description: "Need a React site",
            budget: 500,
            status: 0, // OPEN
          },
        ]);
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
                          className="flex items-center justify-between border-b border-gray-700 py-1"
                        >
                          <span>
                            Milestone {idx + 1}: {m.amount} USDC
                          </span>
                          <span>
                            {m.released
                              ? "paid"
                              : m.submitted
                              ? "submitted"
                              : "pending"}
                          </span>
                        </div>
                      ))}
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
