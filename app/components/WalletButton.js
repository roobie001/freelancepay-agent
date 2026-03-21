"use client";

import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { useConnectModal } from "thirdweb/react";
import { client } from "../../lib/thirdweb";

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton({ compact = false }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { connect, isConnecting } = useConnectModal();

  if (!account) {
    return (
      <button
        onClick={() => connect({ client })}
        className={`${
          compact
            ? "px-4 py-2 text-sm"
            : "px-8 py-4 text-base"
        } rounded-xl bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-semibold shadow-lg`}
        disabled={isConnecting}
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-300 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
        {shortAddress(account.address)}
      </span>
      <button
        onClick={() => wallet && disconnect(wallet)}
        className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs font-semibold"
      >
        Disconnect
      </button>
    </div>
  );
}
