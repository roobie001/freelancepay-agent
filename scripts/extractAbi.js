const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Extracting contract ABIs...");

  // Get the compiled contract artifacts
  const contractNames = ["FreelancePay"];
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

  if (!fs.existsSync(artifactsDir)) {
    console.error(
      "❌ Artifacts directory not found. Run 'npx hardhat compile' first.",
    );
    process.exit(1);
  }

  for (const contractName of contractNames) {
    const artifactPath = path.join(
      artifactsDir,
      `FreelancePay.sol/${contractName}.json`,
    );

    if (!fs.existsSync(artifactPath)) {
      console.error(
        `❌ Artifact for ${contractName} not found at ${artifactPath}`,
      );
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abi = artifact.abi;

    // Save ABI to lib directory for frontend
    const outputPath = path.join(__dirname, `../lib/${contractName}.abi.json`);
    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
    console.log(`✅ ABI saved: ${outputPath}`);
  }

  console.log("\n📝 Frontend can now import ABIs from lib/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
