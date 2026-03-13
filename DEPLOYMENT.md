# Smart Contract Deployment Guide

## Prerequisites

1. **Celo Wallet Address** - Get testnet CELO from Celo faucet
2. **Private Key** - Export from your wallet (keep secure!)
3. **Testnet funds** - Get cUSD on Alfajores from faucet

## Step 1: Set Up Environment Variables

Edit `.env.local` and add your **private key**:

```
PRIVATE_KEY=0x... (your 64-hex-character private key)
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
AI_AGENT_ADDRESS=0x... (update this later with your AI agent)
```

**⚠️ SECURITY WARNING**: Never commit `.env.local` to git. Add it to `.gitignore`.

## Step 2: Compile the Contract

```bash
npm run hardhat:compile
```

This generates:

- Contract bytecode
- ABI files in `artifacts/`

## Step 3: Deploy to Celo Alfajores (Testnet)

```bash
npm run deploy:alfajores
```

**Output:**

- ✅ Contract address (save this!)
- 📋 `deployments.json` with deployment details

Example output:

```
✅ FreelancePay deployed to: 0xABC123...
NEXT_PUBLIC_FREELANCEPAY_ADDRESS=0xABC123...
NEXT_PUBLIC_CUSDC_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
NEXT_PUBLIC_CELO_NETWORK=alfajores
```

## Step 4: Add Contract to Frontend

Copy the contract address from deployment output and add to `.env.local`:

```
NEXT_PUBLIC_FREELANCEPAY_ADDRESS=0xABC123... # Your deployed address
```

## Step 5: Generate ABIs for Frontend

```bash
npm run extract:abi
```

This creates:

- `lib/FreelancePay.abi.json`

Frontend can now import and use the ABI:

```javascript
import FreelancepayABI from "../lib/FreelancePay.abi.json";
```

## Verify on Block Explorer

View your deployment on [Celo Alfajores Scanner](https://alfajores.celoscan.io):

1. Go to: `https://alfajores.celoscan.io/address/0xABC123...`
2. Search for your contract address
3. View transactions, code, state

## Deploy to Mainnet (Celo)

Once tested on testnet:

```bash
npm run deploy:celo
```

## Troubleshooting

### "insufficient funds"

- Get testnet CELO + cUSD from [Celo Faucet](https://faucet.celo.org)

### "invalid private key"

- Ensure `PRIVATE_KEY` is 0x-prefixed 64 hex chars
- Export from MetaMask: Account > ⋯ > Account details > Export private key

### "contract not found"

- Ensure contracts are in `contracts/` folder
- Run `npm run hardhat:compile` first

## Next Steps

1. ✅ Compile + Deploy contract
2. ⏳ Wire frontend to contract (next task)
3. ⏳ Build AI agent to judge disputes
4. ⏳ Register agent on agentscan
