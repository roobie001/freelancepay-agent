import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Extracting contract ABIs...");

  const contractNames = ["FreelancePay"];
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

  if (!fs.existsSync(artifactsDir)) {
    console.error(
      "❌ Artifacts directory not found. Run 'npm run hardhat:compile' first.",
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
