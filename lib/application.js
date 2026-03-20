import { ethers } from "ethers";
import { ensureCeloNetwork } from "./wallet";

const APPLICATION_REGISTRY = process.env.NEXT_PUBLIC_APPLICATION_REGISTRY;

const APPLICATION_ABI = [
  "event ApplicationSubmitted(uint256 indexed jobId, address indexed freelancer, bytes32 applicationHash, string metadataURI)",
  "function submitApplication(uint256 jobId, bytes32 applicationHash, string metadataURI)",
];

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

function getApplicationRegistry(signerOrProvider) {
  if (!APPLICATION_REGISTRY) {
    throw new Error("Application registry is not configured.");
  }
  return new ethers.Contract(
    APPLICATION_REGISTRY,
    APPLICATION_ABI,
    signerOrProvider,
  );
}

export function hashApplication(application) {
  const payload = JSON.stringify(application);
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

export async function submitApplicationOnChain(jobId, applicationHash, metadataURI) {
  const signer = await getSigner();
  const contract = getApplicationRegistry(signer);
  const tx = await contract.submitApplication(jobId, applicationHash, metadataURI || "");
  await tx.wait();
  return tx;
}
