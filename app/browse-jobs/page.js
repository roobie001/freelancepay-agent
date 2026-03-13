"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import { getJobOnChain } from "../../lib/contract";

export default function BrowseJobs() {
  const account = useActiveAccount();
  const [jobs, setJobs] = useState([]);

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

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-6">Browse Jobs</h1>
      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold">{job.title}</h2>
            <p>{job.description}</p>
            <p>Budget: {job.budget} USDC</p>
            <button
              className="bg-green-500 px-4 py-2 rounded mt-2"
              onClick={async () => {
                if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
                  try {
                    await import("../../lib/contract").then((m) =>
                      m.acceptJobOnChain(job.id),
                    );
                    alert("Job accepted on-chain!");
                  } catch (e) {
                    console.error(e);
                    alert("Failed to accept job");
                  }
                } else {
                  alert("(Mock) Job accepted");
                }
              }}
            >
              Apply
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
