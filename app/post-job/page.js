"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { useActiveAccount } from "thirdweb/react";
import { postJobOnChain } from "../../lib/contract";
import Nav from "../Nav";
import { useToast } from "../components/ToastProvider";

const CATEGORY_OPTIONS = [
  "Frontend",
  "Backend",
  "Smart Contract",
  "UI/UX",
  "Full Stack",
  "Mobile",
  "Other",
];

const DEFAULT_MILESTONE = {
  title: "",
  description: "",
  amount: "",
};

export default function PostJob() {
  const account = useActiveAccount();
  const { addToast } = useToast();

  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("");

  const [deliverables, setDeliverables] = useState("");
  const [acceptance, setAcceptance] = useState("");

  const [budget, setBudget] = useState("");
  const [milestones, setMilestones] = useState([{ ...DEFAULT_MILESTONE }]);

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const totalMilestones = useMemo(() => {
    return milestones.reduce((sum, m) => {
      const value = parseFloat(m.amount);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }, [milestones]);

  const formattedWallet = useMemo(() => {
    if (!account?.address) return "";
    return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
  }, [account?.address]);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, trimmed.toLowerCase()]);
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const updateMilestone = (index, field, value) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { ...DEFAULT_MILESTONE }]);
  };

  const removeMilestone = (index) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const next = {};
    if (!jobTitle.trim()) next.jobTitle = "Job title is required.";
    if (!description.trim()) next.description = "Job description is required.";
    if (!category) next.category = "Select a category.";
    if (skills.length === 0) next.skills = "Add at least one skill.";
    if (!deadlineDays || Number(deadlineDays) <= 0) {
      next.deadlineDays = "Enter a valid duration in days.";
    }
    if (!deliverables.trim()) next.deliverables = "Deliverables are required.";
    if (!acceptance.trim()) next.acceptance = "Acceptance criteria is required.";

    if (milestones.length === 0) {
      next.milestones = "Add at least one milestone.";
    } else {
      milestones.forEach((m, idx) => {
        if (!m.title.trim() || !m.description.trim() || !m.amount) {
          next[`milestone-${idx}`] = "Complete title, description, and amount.";
        }
      });
    }

    if (!budget || Number(budget) <= 0) {
      next.budget = "Budget must be greater than 0.";
    }

    if (totalMilestones && Number(budget)) {
      const diff = Math.abs(totalMilestones - Number(budget));
      if (diff > 0.01) {
        next.milestoneSum = "Milestones total must match budget.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setJobTitle("");
    setDescription("");
    setCategory("");
    setSkills([]);
    setSkillInput("");
    setDeadlineDays("");
    setDeliverables("");
    setAcceptance("");
    setBudget("");
    setMilestones([{ ...DEFAULT_MILESTONE }]);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) {
      addToast("Please fix the highlighted errors.", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmEscrow = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const totalBudget = totalMilestones;
      const milestoneAmounts = milestones.map((m) => parseFloat(m.amount));

      const dbResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          description: `${description}\n\nDeliverables:\n${deliverables}\n\nAcceptance Criteria:\n${acceptance}\n\nCategory: ${category}\nSkills: ${skills.join(", ")}\nDeadline: ${deadlineDays} days`,
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

      if (process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS) {
        try {
          const { postJobWithMilestonesOnChain, ensureStablecoinAllowance } =
            await import("../../lib/contract");
          const totalUnits = ethers.parseUnits(totalBudget.toString(), 6);
          await ensureStablecoinAllowance(totalUnits);
          const blockchainResult = await postJobWithMilestonesOnChain(
            jobTitle,
            description,
            milestoneAmounts,
          );
          await fetch(`/api/jobs/${dbJob.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainId: blockchainResult.jobId,
            }),
          });
          addToast(
            `Escrow funded. Job posted! Chain ID: ${blockchainResult.jobId}`,
            "success",
          );
        } catch (blockchainError) {
          const message =
            blockchainError?.shortMessage ||
            blockchainError?.message ||
            (typeof blockchainError === "string"
              ? blockchainError
              : JSON.stringify(blockchainError));
          addToast(
            `Job created (ID: ${dbJob.id}) but escrow failed: ${message}`,
            "error",
          );
        }
      } else {
        addToast(`Job posted successfully! Job ID: ${dbJob.id}`, "success");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      addToast(`Failed to post job: ${err.message}`, "error");
    } finally {
      setLoading(false);
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
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Post a Job
            </h1>
            <p className="text-gray-400 mt-2">
              Fund escrow, define deliverables, and protect both parties with AI disputes.
            </p>
          </header>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Job Details</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                placeholder="Build a production landing page"
              />
              {errors.jobTitle && (
                <p className="text-xs text-red-400 mt-1">{errors.jobTitle}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Job Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 h-28"
                placeholder="Explain the scope, constraints, and context."
              />
              {errors.description && (
                <p className="text-xs text-red-400 mt-1">{errors.description}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-400 mt-1">{errors.category}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="14"
                />
                {errors.deadlineDays && (
                  <p className="text-xs text-red-400 mt-1">{errors.deadlineDays}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Budget (USDC)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="1200"
                />
                {errors.budget && (
                  <p className="text-xs text-red-400 mt-1">{errors.budget}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Skills Required</label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="React, Tailwind, Solidity"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
                >
                  Add Skill
                </button>
              </div>
              {errors.skills && (
                <p className="text-xs text-red-400 mt-1">{errors.skills}</p>
              )}
              {skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        className="text-gray-400 hover:text-white"
                        onClick={() => removeSkill(skill)}
                      >
                        
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Milestones</h2>
            {errors.milestones && (
              <p className="text-xs text-red-400">{errors.milestones}</p>
            )}
            {milestones.map((milestone, index) => (
              <div
                key={`milestone-${index}`}
                className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Milestone {index + 1}</h3>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={milestone.title}
                    onChange={(e) => updateMilestone(index, "title", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
                    placeholder="Milestone title"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(index, "amount", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
                    placeholder="Amount (USDC)"
                  />
                </div>
                <textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, "description", e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500 h-24"
                  placeholder="Describe what will be delivered for this milestone"
                />
                {errors[`milestone-${index}`] && (
                  <p className="text-xs text-red-400">{errors[`milestone-${index}`]}</p>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMilestone}
              className="px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700"
            >
              Add Milestone
            </button>
            {errors.milestoneSum && (
              <p className="text-xs text-red-400">{errors.milestoneSum}</p>
            )}
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Dispute-Ready Requirements</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Deliverables</label>
              <textarea
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500 h-24"
                placeholder="Specify files, links, or artifacts the freelancer must submit"
              />
              {errors.deliverables && (
                <p className="text-xs text-red-400 mt-1">{errors.deliverables}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Acceptance Criteria</label>
              <textarea
                value={acceptance}
                onChange={(e) => setAcceptance(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500 h-24"
                placeholder="Define what counts as complete and acceptable work"
              />
              {errors.acceptance && (
                <p className="text-xs text-red-400 mt-1">{errors.acceptance}</p>
              )}
            </div>
          </section>

          <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Payment Summary</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-sm text-gray-400">Total Budget</p>
                <p className="text-2xl font-bold text-green-400">
                  {totalMilestones.toFixed(2)} USDC
                </p>
              </div>
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-sm text-gray-400">Milestones</p>
                <p className="text-2xl font-bold text-blue-400">
                  {milestones.length}
                </p>
              </div>
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-sm text-gray-400">Wallet</p>
                <p className="text-lg text-gray-200">
                  {formattedWallet || "Not connected"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <p className="text-sm text-gray-400 mb-2">Milestone breakdown</p>
              <ul className="space-y-2 text-sm text-gray-300">
                {milestones.map((m, idx) => (
                  <li key={`summary-${idx}`} className="flex justify-between">
                    <span>{m.title || `Milestone ${idx + 1}`}</span>
                    <span>{m.amount || 0} USDC</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-500 disabled:to-gray-600 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transition-all duration-200"
            >
              {loading ? "Submitting..." : "Review & Deposit Escrow"}
            </button>
          </section>
        </div>
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-2xl font-semibold">Confirm Escrow Deposit</h3>
            <p className="text-sm text-gray-400">
              You are about to fund escrow with {totalMilestones.toFixed(2)} USDC.
            </p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Wallet: {formattedWallet}</p>
              <p>Milestones: {milestones.length}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEscrow}
                className="px-4 py-2 rounded-xl bg-green-500 text-black font-semibold"
              >
                Confirm & Fund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
