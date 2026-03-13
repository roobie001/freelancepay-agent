# FreelancePay Smart Contract

The `FreelancePay.sol` contract handles on-chain escrow for freelance jobs on Celo blockchain.

## Features

- **Job posting** with stablecoin (cUSD/cEUR) escrow deposits
- **Freelancer acceptance** and work submission
- **AI agent arbitration** for dispute resolution
- **Atomic payment release** on approval or refund on rejection

## Contract Flow

1. **Client posts job** → Deposits budget into escrow
2. **Freelancer accepts job** → Status changes to IN_PROGRESS
3. **Freelancer submits work** → Status changes to SUBMITTED
4. **AI agent reviews** → Calls `resolveDispute(jobId, approved)`
5. **Payment released or refunded** based on AI judgment

## Deployment

### Prerequisites

- Node.js + npm
- Hardhat or Foundry
- Celo Testnet RPC URL

### Setup

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
npm install @openzeppelin/contracts
```

### Deploy Script

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  // cUSD token address on Celo Alfajores testnet
  const CUSDC_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  const AI_AGENT_ADDRESS = "0x..."; // Your AI agent address

  const FreelancePay = await hre.ethers.getContractFactory("FreelancePay");
  const contract = await FreelancePay.deploy(CUSDC_ADDRESS, AI_AGENT_ADDRESS);
  await contract.deployed();

  console.log("FreelancePay deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Deploy to Celo Alfajores (Testnet)

```bash
npx hardhat run scripts/deploy.js --network alfajores
```

## Contract Methods

### Client Functions

- `postJob(title, description, budget)` - Create job with escrow
- `refundClient(jobId)` - Refund if dispute rejected

### Freelancer Functions

- `acceptJob(jobId)` - Accept an open job
- `submitWork(jobId)` - Submit completed work

### AI Agent Functions

- `resolveDispute(jobId, approved)` - Judge submission and release/refuse payment

### View Functions

- `getJob(jobId)` - Get job details
- `getClientJobs(clientAddress)` - List client's jobs
- `getFreelancerJobs(freelancerAddress)` - List freelancer's jobs

## Environment Variables for Frontend

Add to `.env.local`:

```
NEXT_PUBLIC_FREELANCEPAY_ADDRESS=0x...
NEXT_PUBLIC_CUSDC_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
NEXT_PUBLIC_CELO_RPC=https://alfajores-forno.celo-testnet.org
```

## Next Steps

1. Deploy to Celo Alfajores
2. Wire contract ABI to frontend
3. Implement job posting UI with escrow
4. Build AI agent to call `resolveDispute`
