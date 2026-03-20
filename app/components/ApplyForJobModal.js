"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastProvider";
import {
  hashApplication,
  submitApplicationOnChain,
} from "../../lib/application";

const ENFORCE_MILESTONE_SUM = false;

function emptyMilestone() {
  return { title: "", amount: "", duration: "" };
}

export default function ApplyForJobModal({
  isOpen,
  onClose,
  job,
  walletAddress,
}) {
  const { addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [timeline, setTimeline] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [milestones, setMilestones] = useState([emptyMilestone()]);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (job?.budget && isOpen) {
      setBidAmount(job.budget.toString());
    }
  }, [job, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const milestoneTotal = useMemo(() => {
    return milestones.reduce((sum, m) => {
      const value = parseFloat(m.amount);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }, [milestones]);

  const resetForm = () => {
    setCoverLetter("");
    setTimeline("");
    setBidAmount(job?.budget?.toString() || "");
    setDeliverables("");
    setMilestones([emptyMilestone()]);
    setPortfolioLink("");
    setAgreedToTerms(false);
    setLoading(false);
    setError("");
    setSuccess("");
  };

  const handleOutsideClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, emptyMilestone()]);
  };

  const handleRemoveMilestone = (index) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index, field, value) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const validate = () => {
    if (coverLetter.trim().length < 50) {
      return "Cover letter must be at least 50 characters.";
    }
    if (!timeline || Number(timeline) <= 0) {
      return "Proposed timeline must be greater than 0.";
    }
    if (!bidAmount || Number(bidAmount) <= 0) {
      return "Bid amount must be greater than 0.";
    }
    if (!milestones.length) {
      return "At least one milestone is required.";
    }
    const invalidMilestone = milestones.find(
      (m) =>
        !m.title?.trim() ||
        !m.amount ||
        Number(m.amount) <= 0 ||
        !m.duration ||
        Number(m.duration) <= 0,
    );
    if (invalidMilestone) {
      return "Each milestone requires title, amount, and duration.";
    }
    if (!agreedToTerms) {
      return "You must agree to the terms.";
    }
    if (
      ENFORCE_MILESTONE_SUM &&
      milestoneTotal > 0 &&
      Number(bidAmount) !== milestoneTotal
    ) {
      return "Milestone total must equal the bid amount.";
    }
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (
      job?.client?.address &&
      walletAddress &&
      job.client.address.toLowerCase() === walletAddress.toLowerCase()
    ) {
      setError("You cannot apply to your own job.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const application = {
      jobId: job?.id,
      freelancer: walletAddress,
      coverLetter,
      bidAmount: Number(bidAmount),
      timeline: Number(timeline),
      deliverables,
      milestones: milestones.map((m) => ({
        title: m.title,
        amount: Number(m.amount),
        duration: Number(m.duration),
      })),
      portfolioLink: portfolioLink || null,
      agreedToTerms,
      createdAt: new Date().toISOString(),
    };

    setLoading(true);
    try {
      // TODO: integrate Celo smart contract write
      // TODO: upload application JSON to IPFS and store hash

      const appHash = hashApplication(application);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job?.id,
          freelancerAddress: walletAddress,
          proposal: coverLetter,
          proposedRate: bidAmount,
          coverLetter,
          timeline,
          bidAmount,
          deliverables,
          milestones,
          portfolioLink,
          agreedToTerms,
          applicationHash: appHash,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit application.");
      }

      const created = await response.json();
      if (process.env.NEXT_PUBLIC_APPLICATION_REGISTRY && job?.blockchainId) {
        try {
          const tx = await submitApplicationOnChain(
            job.blockchainId,
            appHash,
            "",
          );
          await fetch(`/api/applications/${created.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chainTxHash: tx?.hash || null,
              applicationHash: appHash,
            }),
          });
        } catch (e) {
          addToast(
            e?.message || "On-chain submission failed. Saved to DB only.",
            "error",
          );
        }
      }

      setSuccess("Application submitted successfully!");
      addToast("Application submitted successfully!", "success");

      setTimeout(() => {
        resetForm();
        onClose?.();
      }, 600);
    } catch (e) {
      const message = e?.message || "Failed to submit application.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={handleOutsideClick}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl bg-gray-900 text-white shadow-xl border border-gray-800 transform transition-all duration-200 ${
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-semibold text-green-400">
              Apply for Job
            </h2>
            <p className="text-sm text-gray-400">
              {job?.title || "Job"} • Budget {job?.budget ?? "-"} USDC
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Cover Letter
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="w-full h-28 p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
              placeholder="Describe why you're the best fit..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 50 characters
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Proposed Timeline (days)
              </label>
              <input
                type="number"
                min="1"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                placeholder="e.g., 7"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Bid Amount (USDC)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Deliverables
            </label>
            <textarea
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="w-full h-24 p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
              placeholder="Clearly describe what you will deliver"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-gray-300 mb-2 font-semibold">
                Milestones
              </label>
              <button
                onClick={handleAddMilestone}
                className="text-sm text-green-400 hover:text-green-300"
              >
                + Add Milestone
              </button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div
                  key={`milestone-${idx}`}
                  className="grid gap-3 md:grid-cols-3 bg-gray-800 p-3 rounded-xl border border-gray-700"
                >
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) =>
                      handleMilestoneChange(idx, "title", e.target.value)
                    }
                    className="p-3 bg-gray-900 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="Milestone title"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={m.amount}
                    onChange={(e) =>
                      handleMilestoneChange(idx, "amount", e.target.value)
                    }
                    className="p-3 bg-gray-900 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="Amount"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={m.duration}
                      onChange={(e) =>
                        handleMilestoneChange(idx, "duration", e.target.value)
                      }
                      className="flex-1 p-3 bg-gray-900 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                      placeholder="Days"
                    />
                    <button
                      onClick={() => handleRemoveMilestone(idx)}
                      className="px-3 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
                      disabled={milestones.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Milestone total: {milestoneTotal.toFixed(2)} USDC
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-semibold">
              Portfolio Link (optional)
            </label>
            <input
              type="url"
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
              className="w-full p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
              placeholder="https://..."
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 accent-green-500"
            />
            <span>
              I agree to deliver according to the job description and milestones
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-400 bg-green-500/10 p-3 rounded-lg">
              {success}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 font-semibold shadow-lg disabled:bg-gray-600"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
