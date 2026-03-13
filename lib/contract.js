import { ethers } from "ethers";
import FreelancePayABI from "./FreelancePay.abi.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FREELANCEPAY_ADDRESS;
const CUSDC_ADDRESS = process.env.NEXT_PUBLIC_CUSDC_ADDRESS;

function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return ethers.getDefaultProvider(
    process.env.NEXT_PUBLIC_CELO_NETWORK || "alfajores",
  );
}

function getSigner() {
  const provider = getProvider();
  return provider.getSigner();
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

export async function postJobOnChain(title, description, budget) {
  const signer = getSigner();
  const contract = getContract(signer);

  const tx = await contract.postJob(
    title,
    description,
    ethers.utils.parseUnits(budget.toString(), 6),
  );
  const receipt = await tx.wait();
  const event = receipt.events.find((e) => e.event === "JobCreated");
  return {
    jobId: event.args.jobId.toNumber(),
  };
}

export async function getJobOnChain(jobId) {
  const provider = getProvider();
  const contract = getContract(provider);
  const job = await contract.getJob(jobId);
  return {
    ...job,
    budget: parseFloat(ethers.utils.formatUnits(job.budget, 6)),
    status: job.status.toNumber(),
  };
}

export async function acceptJobOnChain(jobId) {
  const signer = getSigner();
  const contract = getContract(signer);
  const tx = await contract.acceptJob(jobId);
  await tx.wait();
}

export async function submitWorkOnChain(jobId) {
  const signer = getSigner();
  const contract = getContract(signer);
  const tx = await contract.submitWork(jobId);
  await tx.wait();
}

export async function resolveDisputeOnChain(jobId, approved) {
  const signer = getSigner();
  const contract = getContract(signer);
  const tx = await contract.resolveDispute(jobId, approved);
  await tx.wait();
}

export async function refundClientOnChain(jobId) {
  const signer = getSigner();
  const contract = getContract(signer);
  const tx = await contract.refundClient(jobId);
  await tx.wait();
}
