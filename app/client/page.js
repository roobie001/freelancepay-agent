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
            jobIds.map((id) => contract.getJobOnChain(id)),
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
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
