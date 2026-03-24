"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import { acceptJobOnChain } from "../../lib/contract";
import ApplyForJobModal from "../components/ApplyForJobModal";
import Nav from "../Nav";
import { useToast } from "../components/ToastProvider";

export default function BrowseJobs() {
  const account = useActiveAccount();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptedJobs, setAcceptedJobs] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [activeJob, setActiveJob] = useState(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch('/api/jobs');
        if (response.ok) {
          const jobsData = await response.json();
          setJobs(jobsData);
        } else {
          console.error('Failed to fetch jobs');
          // Fallback to mock data
          setJobs([
            {
              id: '1',
              title: "Build a website",
              description: "Need a React site",
              budget: 500,
            },
            {
              id: '2',
              title: "Write smart contract",
              description: "Solidity escrow",
              budget: 1000,
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        // Fallback to mock data
        setJobs([
          {
            id: '1',
            title: "Build a website",
            description: "Need a React site",
            budget: 500,
          },
          {
            id: '2',
            title: "Write smart contract",
            description: "Solidity escrow",
            budget: 1000,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const handleApply = async (jobId, job) => {
    if (!account?.address) {
      addToast("Please connect your wallet first.", "info");
      return;
    }

    try {
      if (
        job?.client?.address &&
        job.client.address.toLowerCase() === account.address.toLowerCase()
      ) {
        addToast("You cannot apply to a job you posted.", "error");
        return;
      }
      setActiveJob(job || jobs.find((j) => j.id === jobId));
      setShowModal(true);
    } catch (error) {
      console.error('Error applying to job:', error);
      addToast("Failed to apply to job.", "error");
    }
  };

  const handleAccept = async (jobId, blockchainId) => {
    if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
      try {
        const job = jobs.find((j) => j.id === jobId);
        if (
          job?.client?.address &&
          account?.address &&
          job.client.address.toLowerCase() === account.address.toLowerCase()
        ) {
          addToast("You cannot accept your own job.", "error");
          return;
        }
        const idToUse = typeof blockchainId === "number" ? blockchainId : jobId;
        await acceptJobOnChain(idToUse);
        addToast("Job accepted on-chain.", "success");
        setAcceptedJobs((prev) => new Set([...prev, idToUse]));
      } catch (e) {
        console.error(e);
        addToast("Failed to accept job.", "error");
      }
    } else {
      addToast("Job accepted (mock).", "info");
      setAcceptedJobs((prev) => new Set([...prev, jobId]));
    }
  };

  const handleSubmit = async (jobId, blockchainId) => {
    if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
      try {
        const { submitMilestoneOnChain } = await import("../../lib/contract");
        const idToUse = typeof blockchainId === "number" ? blockchainId : jobId;
        await submitMilestoneOnChain(idToUse);
        addToast("Work submitted on-chain.", "success");
      } catch (e) {
        console.error(e);
        addToast("Failed to submit work.", "error");
      }
    } else {
      addToast("Work submitted (mock).", "info");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveJob(null);
  };

  if (loading) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
              Browse Jobs
            </h1>
            <p>Loading jobs...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
            Browse Jobs
          </h1>
          {jobs.length === 0 ? (
            <p className="text-center text-gray-400">No jobs available at the moment.</p>
          ) : (
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
                  <p className="text-yellow-400 font-semibold mb-2">
                    Budget: {job.budget} USDC
                  </p>
                  {job.milestones && job.milestones.length > 0 && (
                    <p className="text-gray-400 text-sm mb-2">
                      {job.milestones.length} milestone
                      {job.milestones.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm mb-4">
                    Client: {job.client?.name || `${job.client?.address?.slice(0, 6)}...${job.client?.address?.slice(-4)}`}
                  </p>
                  {job.applications && job.applications.length > 0 && (
                    <p className="text-blue-400 text-sm mb-4">
                      {job.applications.length} application{job.applications.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {acceptedJobs.has(job.blockchainId ?? job.id) ? (
                    <button
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                      onClick={() => handleSubmit(job.id, job.blockchainId)}
                    >
                      Submit Work
                    </button>
                  ) : (
                    <button
                      className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                      onClick={() => handleApply(job.id, job)}
                    >
                      Apply for Job
                    </button>
                  )}
                  {process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS &&
                    job.blockchainId && (
                      <button
                        className="mt-3 w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                        onClick={() => handleAccept(job.id, job.blockchainId)}
                      >
                        Accept On-Chain
                      </button>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ApplyForJobModal
        isOpen={showModal}
        onClose={closeModal}
        job={activeJob}
        walletAddress={account?.address || ""}
      />
    </>
  );
}
