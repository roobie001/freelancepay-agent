"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import { getJobOnChain } from "../../lib/contract";
import Nav from "../Nav";

export default function BrowseJobs() {
  const account = useActiveAccount();
  const [jobs, setJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState(new Set());

  useEffect(() => {
    async function loadJobs() {
      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        try {
          const j1 = await getJobOnChain(1);
          const j2 = await getJobOnChain(2);
          setJobs([j1, j2]);
        } catch (e) {
          console.error("failed to load onchain jobs", e);
          // fallback to placeholders
          setJobs([
            {
              id: 1,
              title: "Build a website",
              description: "Need a React site",
              budget: 500,
            },
            {
              id: 2,
              title: "Write smart contract",
              description: "Solidity escrow",
              budget: 1000,
            },
          ]);
        }
      } else {
        setJobs([
          {
            id: 1,
            title: "Build a website",
            description: "Need a React site",
            budget: 500,
          },
          {
            id: 2,
            title: "Write smart contract",
            description: "Solidity escrow",
            budget: 1000,
          },
        ]);
      }
    }
    loadJobs();
  }, []);

  const handleAccept = async (jobId) => {
    if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
      try {
        await import("../../lib/contract").then((m) =>
          m.acceptJobOnChain(jobId),
        );
        alert("Job accepted on-chain!");
        setAcceptedJobs((prev) => new Set([...prev, jobId]));
      } catch (e) {
        console.error(e);
        alert("Failed to accept job");
      }
    } else {
      alert("(Mock) Job accepted");
      setAcceptedJobs((prev) => new Set([...prev, jobId]));
    }
  };

  const handleSubmit = async (jobId) => {
    if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
      try {
        await import("../../lib/contract").then((m) =>
          m.submitWorkOnChain(jobId),
        );
        alert("Work submitted on-chain!");
      } catch (e) {
        console.error(e);
        alert("Failed to submit work");
      }
    } else {
      alert("(Mock) Work submitted");
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
            Browse Jobs
          </h1>
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-gray-800 p-6 rounded-2xl shadow-2xl hover:shadow-green-500/20 transition-shadow duration-300"
              >
                <h2 className="text-2xl font-semibold mb-2 text-green-400">
                  {job.title}
                </h2>
                <p className="text-gray-300 mb-4 leading-relaxed">
                  {job.description}
                </p>
                <p className="text-yellow-400 font-semibold mb-4">
                  Budget: {job.budget} USDC
                </p>
                {acceptedJobs.has(job.id) ? (
                  <button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                    onClick={() => handleSubmit(job.id)}
                  >
                    Submit Work
                  </button>
                ) : (
                  <button
                    className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                    onClick={() => handleAccept(job.id)}
                  >
                    Apply for Job
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
