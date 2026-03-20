import { ethers } from "ethers";
import { ensureCeloNetwork } from "./wallet";

const IDENTITY_REGISTRY = process.env.NEXT_PUBLIC_IDENTITY_REGISTRY;
const REPUTATION_REGISTRY = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY;

const IDENTITY_ABI = [
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri)",
  "function registerAgent(string uri) returns (uint256)",
];

const REPUTATION_ABI = [
  "function submitReputation(uint256 agentId, int8 rating, string metadataURI)",
  "function getReputation(uint256 agentId) view returns (int256 score, uint256 count)",
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

function getIdentityContract(signerOrProvider) {
  if (!IDENTITY_REGISTRY) {
    throw new Error("Identity registry not configured.");
  }
  return new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, signerOrProvider);
}

function getReputationContract(signerOrProvider) {
  if (!REPUTATION_REGISTRY) {
    throw new Error("Reputation registry not configured.");
  }
  return new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_ABI,
    signerOrProvider,
  );
}

export async function registerAgentOnChain(uri) {
  const signer = await getSigner();
  const contract = getIdentityContract(signer);
  const tx = await contract.registerAgent(uri);
  const receipt = await tx.wait();
  const logs = receipt.logs || [];
  const iface = contract.interface;
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "AgentRegistered") {
        return parsed.args.agentId?.toString
          ? Number(parsed.args.agentId.toString())
          : parsed.args.agentId;
      }
    } catch (_) {
      // ignore non-matching logs
    }
  }
  return null;
}

export async function submitReputationOnChain(agentId, rating, metadataURI) {
  const signer = await getSigner();
  const contract = getReputationContract(signer);
  const tx = await contract.submitReputation(agentId, rating, metadataURI);
  await tx.wait();
}

export async function getReputationOnChain(agentId) {
  const provider = getProvider();
  const contract = getReputationContract(provider);
  const result = await contract.getReputation(agentId);
  return {
    score: result[0].toString(),
    count: result[1].toString(),
  };
}
