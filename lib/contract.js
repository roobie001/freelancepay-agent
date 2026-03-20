import { ethers } from "ethers";
import FreelancePayABI from "./FreelancePay.abi.json";
import { ensureCeloNetwork } from "./wallet";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS;
const CUSDC_ADDRESS = process.env.NEXT_PUBLIC_CUSDC_ADDRESS;

function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return ethers.getDefaultProvider(
    process.env.NEXT_PUBLIC_CELO_NETWORK || "alfajores",
  );
}

async function getSigner() {
  await ensureCeloNetwork();
  const provider = getProvider();
  if (provider instanceof ethers.BrowserProvider) {
    return await provider.getSigner();
  }
  throw new Error("Signer requires a browser wallet.");
}

function getContract(signerOrProvider) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("FreelancePay contract address is not configured.");
  }
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    FreelancePayABI,
    signerOrProvider,
  );
}

function getJobCreatedId(receipt, contract) {
  const logs = receipt.logs || [];
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "JobCreated") {
        return parsed.args.jobId?.toString
          ? Number(parsed.args.jobId.toString())
          : parsed.args.jobId;
      }
    } catch (_) {
      // ignore non-matching logs
    }
  }
  return null;
}

export async function postJobOnChain(title, description, budget) {
  const signer = await getSigner();
  const contract = getContract(signer);

  const tx = await contract.postJob(
    title,
    description,
    ethers.parseUnits(budget.toString(), 6),
  );
  const receipt = await tx.wait();
  const jobId = getJobCreatedId(receipt, contract);
  return { jobId };
}

export async function postJobWithMilestonesOnChain(
  title,
  description,
  milestoneBudgets,
) {
  const signer = await getSigner();
  const contract = getContract(signer);

  const parsedMilestones = milestoneBudgets.map((m) =>
    ethers.parseUnits(m.toString(), 6),
  );
  const tx = await contract.postJobWithMilestones(
    title,
    description,
    parsedMilestones,
  );
  const receipt = await tx.wait();
  const jobId = getJobCreatedId(receipt, contract);
  return { jobId };
}

export async function getJobOnChain(jobId) {
  const provider = getProvider();
  const contract = getContract(provider);
  const job = await contract.getJob(jobId);
  return {
    ...job,
    budget: parseFloat(ethers.formatUnits(job.budget, 6)),
    status: job.status.toNumber(),
    milestoneCount: job.milestoneCount?.toNumber?.() ?? job.milestoneCount,
    currentMilestone:
      job.currentMilestone?.toNumber?.() ?? job.currentMilestone,
    escrowRemaining: job.escrowRemaining
      ? parseFloat(ethers.formatUnits(job.escrowRemaining, 6))
      : 0,
  };
}

export async function acceptJobOnChain(jobId) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.acceptJob(jobId);
  await tx.wait();
}

export async function submitWorkOnChain(jobId) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.submitWork(jobId);
  await tx.wait();
}

export async function submitMilestoneOnChain(jobId) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.submitMilestone(jobId);
  await tx.wait();
}

export async function approveMilestoneOnChain(jobId) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.approveMilestone(jobId);
  await tx.wait();
}

export async function getMilestoneCountOnChain(jobId) {
  const provider = getProvider();
  const contract = getContract(provider);
  const count = await contract.getMilestoneCount(jobId);
  return count.toNumber();
}

export async function getMilestoneOnChain(jobId, index) {
  const provider = getProvider();
  const contract = getContract(provider);
  const milestone = await contract.getMilestone(jobId, index);
  return {
    ...milestone,
    amount: parseFloat(ethers.formatUnits(milestone.amount, 6)),
  };
}

export async function resolveDisputeOnChain(jobId, approved) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.resolveDispute(jobId, approved);
  await tx.wait();
}

export async function getClientJobsOnChain(clientAddress) {
  const provider = getProvider();
  const contract = getContract(provider);
  return await contract.getClientJobs(clientAddress);
}

export async function refundClientOnChain(jobId) {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.refundClient(jobId);
  await tx.wait();
}
