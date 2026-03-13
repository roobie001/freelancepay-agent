## 🚀 Quick Deploy with Thirdweb (Recommended Alternative)

Since Hardhat setup is taking time, here's the fastest path to deployment:

### Option 1: Use Thirdweb's Dashboard (5 minutes)

1. **Go to**: https://thirdweb.com/dashboard
2. **Connect your wallet** with test funds on Celo Alfajores
3. **Deploy → Smart Contracts → Deploy New**
4. **Upload or paste** `FreelancePay.sol`
5. **Set constructor params**:
   - `_stablecoin`: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` (cUSD)
   - `_aiAgent`: Your wallet address (for now)
6. **Deploy!**
7. **Copy contract address** and add to `.env.local`:
   ```
   NEXT_PUBLIC_FREELANCEPAY_ADDRESS=0x...
   ```

### Option 2: Use Celo CLI

```bash
npm install -g celocli
celocli contract:deploy contracts/FreelancePay.sol \
  --from your_wallet_address \
  --network alfajores
```

### Option 3: Use Remix IDE

1. Go to: https://remix.ethereum.org
2. Create file: `FreelancePay.sol`
3. Paste contract code
4. Compiler → Compile
5. Deploy → Select "Injected Provider" (MetaMask/Alfajores)
6. Constructor inputs: cUSD address, AI agent address
7. Deploy!

---

## For Development: Skip Contract for Now

You can **mock the contract** on the frontend first:

```javascript
// lib/mockContract.js
export const mockContract = {
  postJob: async (title, desc, budget) => {
    const jobId = Math.floor(Math.random() * 1000);
    console.log("Mock job created:", jobId);
    return { jobId, status: "OPEN" };
  },
  getJob: async (jobId) => ({
    id: jobId,
    title: "Sample Job",
    budget: 100,
    status: "OPEN",
  }),
};
```

This lets you **build the UI while deployment catches up**.

---

## Next: Wire Frontend to Contract (Once Deployed)

Once you have a deployed contract address, wire it to the frontend in the next task.
