const NETWORKS = {
  "celo-sepolia": {
    chainId: "0xaa044c",
    chainName: "Celo Sepolia",
    rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    blockExplorerUrls: ["https://explorer.celo-sepolia.org"],
  },
  alfajores: {
    chainId: "0xaef3",
    chainName: "Celo Alfajores",
    rpcUrls: ["https://alfajores-forno.celo-testnet.org"],
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    blockExplorerUrls: ["https://alfajores.celoscan.io"],
  },
};

export async function ensureCeloNetwork() {
  if (typeof window === "undefined" || !window.ethereum) return;

  const networkKey = process.env.NEXT_PUBLIC_CELO_NETWORK || "alfajores";
  const target = NETWORKS[networkKey];
  if (!target) return;

  const currentChainId = await window.ethereum.request({
    method: "eth_chainId",
  });

  if (currentChainId === target.chainId) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target.chainId }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [target],
      });
    } else {
      throw error;
    }
  }
}
