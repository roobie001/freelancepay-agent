"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useActiveAccount } from "thirdweb/react";
import { postJobOnChain } from "../../lib/contract";
import Nav from "../Nav";

export default function PostJob() {
  const account = useActiveAccount();
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [milestones, setMilestones] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const milestoneAmounts = milestones
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
        .map((m) => parseFloat(m))
        .filter((m) => Number.isFinite(m) && m > 0);

      const totalBudget = milestoneAmounts.length
        ? milestoneAmounts.reduce((sum, m) => sum + m, 0)
        : parseFloat(budget);

      if (!totalBudget || totalBudget <= 0) {
        throw new Error("Please enter a valid budget or milestones.");
      }

      // First create job in database
      const dbResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: jobTitle,
          description,
          budget: totalBudget,
          clientAddress: account.address,
          milestones: milestoneAmounts,
        }),
      });

      if (!dbResponse.ok) {
        const error = await dbResponse.json();
        throw new Error(error.error || "Failed to create job in database");
      }

      const dbJob = await dbResponse.json();

      // Then try to post on blockchain if contract is configured
      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        try {
          const { postJobWithMilestonesOnChain, ensureStablecoinAllowance } =
            await import("../../lib/contract");
          const totalUnits = ethers.parseUnits(totalBudget.toString(), 6);
          await ensureStablecoinAllowance(totalUnits);
          const blockchainResult = milestoneAmounts.length
            ? await postJobWithMilestonesOnChain(
                jobTitle,
                description,
                milestoneAmounts,
              )
            : await postJobOnChain(jobTitle, description, totalBudget);
          // Update database with blockchain ID
          await fetch(`/api/jobs/${dbJob.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              blockchainId: blockchainResult.jobId,
            }),
          });
          alert(
            `Job posted successfully! Job ID: ${dbJob.id} (Blockchain ID: ${blockchainResult.jobId})`,
          );
        } catch (blockchainError) {
          console.error("Blockchain posting failed:", blockchainError);
          const message =
            blockchainError?.shortMessage ||
            blockchainError?.message ||
            (typeof blockchainError === "string"
              ? blockchainError
              : JSON.stringify(blockchainError));
          alert(
            `Job created in database (ID: ${dbJob.id}) but blockchain posting failed: ${message}`,
          );
        }
      } else {
        alert(`Job posted successfully! Job ID: ${dbJob.id}`);
      }

      // Reset form
      setJobTitle("");
      setDescription("");
      setBudget("");
      setMilestones("");
    } catch (err) {
      console.error(err);
      alert(`Failed to post job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Post a Job
          </h1>
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-gray-800 p-8 rounded-2xl shadow-2xl"
          >
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Job Title
              </label>
              <input
                type="text"
                placeholder="e.g., Build a React Website"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Job Description
              </label>
              <textarea
                placeholder="Describe the job requirements in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors h-32 resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Budget (in USDC)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Milestones (comma-separated USDC amounts)
              </label>
              <input
                type="text"
                placeholder="e.g., 200, 300, 500"
                value={milestones}
                onChange={(e) => setMilestones(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
              <p className="text-sm text-gray-400 mt-2">
                If you provide milestones, the total budget is the sum.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-500 disabled:to-gray-600 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? "Posting Job..." : "Post Job & Deposit Escrow"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
