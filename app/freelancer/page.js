"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import Nav from "../Nav";

export default function FreelancerDashboard() {
  const account = useActiveAccount();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [deliverableUri, setDeliverableUri] = useState({});
  const [deliverableDesc, setDeliverableDesc] = useState({});

  useEffect(() => {
    async function loadJobs() {
      if (!account?.address) return;
      try {
        const res = await fetch(
          `/api/freelancer/jobs?address=${account.address}`,
        );
        if (res.ok) {
          setJobs(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [account]);

  const handleSubmitMilestone = async (job) => {
    if (!job?.blockchainId) {
      alert("Job is not linked to blockchain yet.");
      return;
    }
    try {
      setSubmitting(job.id);
      const { submitMilestoneOnChain } = await import("../../lib/contract");
      await submitMilestoneOnChain(job.blockchainId);
      alert("Milestone submitted on-chain!");
      const next = job.milestones?.find((m) => m.status === "pending");
      if (next) {
        await fetch("/api/milestones/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, index: next.index }),
        });
      }
      const refreshed = await fetch(
        `/api/freelancer/jobs?address=${account.address}`,
      );
      if (refreshed.ok) {
        setJobs(await refreshed.json());
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit milestone");
    } finally {
      setSubmitting(null);
    }
  };

  const handleUploadDeliverable = async (job) => {
    const uri = deliverableUri[job.id] || "";
    const desc = deliverableDesc[job.id] || "";
    if (!uri) {
      alert("Please provide a deliverable link.");
      return;
    }
    try {
      setUploading(job.id);
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          freelancerAddress: account.address,
          uri,
          description: desc,
        }),
      });
      setDeliverableUri((prev) => ({ ...prev, [job.id]: "" }));
      setDeliverableDesc((prev) => ({ ...prev, [job.id]: "" }));
      const refreshed = await fetch(
        `/api/freelancer/jobs?address=${account.address}`,
      );
      if (refreshed.ok) {
        setJobs(await refreshed.json());
      }
      alert("Deliverable submitted!");
    } catch (e) {
      console.error(e);
      alert("Failed to submit deliverable");
    } finally {
      setUploading(null);
    }
  };

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
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
            Freelancer Dashboard
          </h1>
          {loading ? (
            <p className="text-center text-gray-400">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-center text-gray-400">
              No accepted jobs yet.
            </p>
          ) : (
            <div className="space-y-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-gray-800 p-6 rounded-2xl shadow-2xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-semibold text-green-400">
                      {job.title}
                    </h2>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-600">
                      {job.status}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{job.description}</p>
                  <p className="text-yellow-400 font-semibold">
                    Budget: {job.budget} USDC
                  </p>
                  {job.milestones && job.milestones.length > 0 && (
                    <div className="mt-3 text-sm text-gray-300">
                      <p className="text-gray-400 mb-1">Milestones</p>
                      <div className="space-y-2">
                        {job.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2 border border-gray-700"
                          >
                            <span>
                              #{m.index + 1} • {m.amount} USDC
                            </span>
                            <span className="text-xs text-gray-400">
                              {m.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.agreement && (
                    <div className="mt-4 text-sm text-gray-300">
                      <p>
                        <strong>Agreed Amount:</strong>{" "}
                        {job.agreement.agreedAmount} USDC
                      </p>
                      <p>
                        <strong>Deadline:</strong>{" "}
                        {job.agreement.deadlineDays || "N/A"} days
                      </p>
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    <button
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-lg text-white font-semibold"
                      onClick={() => handleSubmitMilestone(job)}
                      disabled={submitting === job.id}
                    >
                      {submitting === job.id
                        ? "Submitting..."
                        : "Submit Milestone"}
                    </button>
                    <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                      <p className="text-sm text-gray-300 mb-2">
                        Deliverable Link
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          className="text-xs text-gray-300"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setUploading(job.id);
                              const data = new FormData();
                              data.append("file", file);
                              const res = await fetch("/api/upload", {
                                method: "POST",
                                body: data,
                              });
                              const json = await res.json();
                              if (res.ok) {
                                setDeliverableUri((prev) => ({
                                  ...prev,
                                  [job.id]: json.ipfs || json.gateway,
                                }));
                              } else {
                                alert(json.error || "Upload failed");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Upload failed");
                            } finally {
                              setUploading(null);
                            }
                          }}
                        />
                        {uploading === job.id && (
                          <span className="text-xs text-gray-400">
                            Uploading...
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="https://... or ipfs://..."
                        value={deliverableUri[job.id] || ""}
                        onChange={(e) =>
                          setDeliverableUri((prev) => ({
                            ...prev,
                            [job.id]: e.target.value,
                          }))
                        }
                        className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Short description (optional)"
                        value={deliverableDesc[job.id] || ""}
                        onChange={(e) =>
                          setDeliverableDesc((prev) => ({
                            ...prev,
                            [job.id]: e.target.value,
                          }))
                        }
                        className="mt-2 w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
                      />
                      <button
                        className="mt-3 w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-4 py-2 rounded-lg text-white font-semibold disabled:from-gray-500 disabled:to-gray-600"
                        onClick={() => handleUploadDeliverable(job)}
                        disabled={uploading === job.id}
                      >
                        {uploading === job.id
                          ? "Uploading..."
                          : "Submit Deliverable"}
                      </button>
                    </div>
                    {job.submissions && job.submissions.length > 0 && (
                      <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300">
                        <p className="text-gray-400 mb-2">Submitted Files</p>
                        <ul className="space-y-2">
                          {job.submissions.map((s) => (
                            <li key={s.id}>
                              <a
                                href={s.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 underline"
                              >
                                {s.uri}
                              </a>
                              {s.description && (
                                <p className="text-gray-500">
                                  {s.description}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
