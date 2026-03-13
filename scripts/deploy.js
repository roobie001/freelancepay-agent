const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying FreelancePay contract...");

  // cUSD token address on Celo Alfajores testnet
  const CUSDC_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

  // Placeholder AI agent address - replace with your actual AI agent
  const AI_AGENT_ADDRESS =
    process.env.AI_AGENT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

  const FreelancePay = await hre.ethers.getContractFactory("FreelancePay");
  const contract = await FreelancePay.deploy(CUSDC_ADDRESS, AI_AGENT_ADDRESS);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ FreelancePay deployed to:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    cusdcAddress: CUSDC_ADDRESS,
    aiAgentAddress: AI_AGENT_ADDRESS,
    deploymentBlock: await hre.ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log("📋 Deployment info saved to deployments.json");
  console.log("\n--- Environment Variables to Add ---");
  console.log(`NEXT_PUBLIC_FREELANCEPAY_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_CUSDC_ADDRESS=${CUSDC_ADDRESS}`);
  console.log(`NEXT_PUBLIC_CELO_NETWORK=alfajores`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
