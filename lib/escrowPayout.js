import { ethers } from "ethers";
import FreelancePayABI from "./FreelancePay.abi.json";
import { prisma } from "./prisma";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS;
const RPC_URL = process.env.CELO_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const AI_AGENT_ADDRESS = process.env.AI_AGENT_ADDRESS;

function getServerWallet() {
  if (!RPC_URL) {
    throw new Error("CELO_RPC_URL is not configured.");
  }
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not configured.");
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  if (
    AI_AGENT_ADDRESS &&
    wallet.address.toLowerCase() !== AI_AGENT_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      "Signer address does not match AI_AGENT_ADDRESS. Update env vars.",
    );
  }
  return wallet;
}

function getContract(wallet) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("FreelancePay contract address is not configured.");
  }
  return new ethers.Contract(CONTRACT_ADDRESS, FreelancePayABI, wallet);
}

function normalizeFreelancerPercent(paymentSplit) {
  if (!paymentSplit) return null;
  if (typeof paymentSplit.freelancer === "number") return paymentSplit.freelancer;
  if (typeof paymentSplit.freelancerPercent === "number") {
    return paymentSplit.freelancerPercent;
  }
  if (typeof paymentSplit.clientRefund === "number") {
    return 100 - paymentSplit.clientRefund;
  }
  if (typeof paymentSplit.client === "number") {
    return 100 - paymentSplit.client;
  }
  return null;
}

function decisionToBps(decision, paymentSplit) {
  if (decision === "freelancer") return 10000;
  if (decision === "client") return 0;
  const pct = normalizeFreelancerPercent(paymentSplit);
  if (typeof pct === "number") {
    const clamped = Math.max(0, Math.min(100, pct));
    return Math.round(clamped * 100);
  }
  return 5000;
}

export async function executeEscrowPayout({
  jobChainId,
  decision,
  paymentSplit,
}) {
  if (typeof jobChainId !== "number") {
    throw new Error("jobChainId is required for escrow payout");
  }
  const wallet = getServerWallet();
  const contract = getContract(wallet);
  const bps = decisionToBps(decision, paymentSplit);

  const tx = await contract.resolveDisputeWithSplit(jobChainId, bps);
  const receipt = await tx.wait();
  return {
    txHash: receipt?.hash || tx.hash,
    bps,
  };
}

export async function executeEscrowPayoutForContract({
  contractId,
  decision,
  paymentSplit,
}) {
  if (!contractId) {
    throw new Error("contractId is required for escrow payout");
  }
  const agreement = await prisma.agreement.findUnique({
    where: { id: contractId },
    include: { job: true },
  });
  const jobChainId =
    typeof agreement?.job?.blockchainId === "number"
      ? agreement.job.blockchainId
      : null;
  if (jobChainId === null) {
    throw new Error("Blockchain job ID is missing for this contract");
  }
  return executeEscrowPayout({ jobChainId, decision, paymentSplit });
}
