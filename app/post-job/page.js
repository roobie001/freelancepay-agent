"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { postJobOnChain } from "../../lib/contract";
import { mockContract } from "../../lib/mockContract";

export default function PostJob() {
  const account = useActiveAccount();
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);

  if (!account) {
    return <p>Please connect your wallet first.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        result = await postJobOnChain(jobTitle, description, budget);
      } else {
        result = await mockContract.postJob(
          jobTitle,
          description,
          parseInt(budget),
        );
      }
      alert(`Job posted! Job ID: ${result.jobId}`);
      setJobTitle("");
      setDescription("");
      setBudget("");
    } catch (err) {
      console.error(err);
      alert("Failed to post job; see console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-6">Post a Job</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <input
          type="text"
          placeholder="Job Title"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />
        <textarea
          placeholder="Job Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />
        <input
          type="number"
          placeholder="Budget (in USDC)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Job & Deposit Escrow"}
        </button>
      </form>
    </main>
  );
}
