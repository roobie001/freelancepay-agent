const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying FreelancePay contract...");

  // USDm token address on Celo Sepolia testnet
  const CUSDC_ADDRESS = "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80";

  // Placeholder AI agent address - replace with your actual AI agent
  const AI_AGENT_ADDRESS =
    process.env.AI_AGENT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

  const FreelancePay = await hre.ethers.getContractFactory("FreelancePay");
  const contract = await FreelancePay.deploy(CUSDC_ADDRESS, AI_AGENT_ADDRESS);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("FreelancePay deployed to:", contractAddress);

  console.log("Deploying AgentIdentityRegistry...");
  const AgentIdentityRegistry = await hre.ethers.getContractFactory(
    "AgentIdentityRegistry",
  );
  const identityRegistry = await AgentIdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("AgentIdentityRegistry deployed to:", identityRegistryAddress);

  console.log("Deploying AgentReputationRegistry...");
  const AgentReputationRegistry = await hre.ethers.getContractFactory(
    "AgentReputationRegistry",
  );
  const reputationRegistry = await AgentReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("AgentReputationRegistry deployed to:", reputationRegistryAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    cusdcAddress: CUSDC_ADDRESS,
    aiAgentAddress: AI_AGENT_ADDRESS,
    identityRegistryAddress,
    reputationRegistryAddress,
    deploymentBlock: await hre.ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log("Deployment info saved to deployments.json");
  console.log("\n--- Environment Variables to Add ---");
  console.log(`NEXT_PUBLIC_FREELANCEPAY_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_CUSDC_ADDRESS=${CUSDC_ADDRESS}`);
  console.log(`NEXT_PUBLIC_CELO_NETWORK=celo-sepolia`);
  console.log(`NEXT_PUBLIC_IDENTITY_REGISTRY=${identityRegistryAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_REGISTRY=${reputationRegistryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
