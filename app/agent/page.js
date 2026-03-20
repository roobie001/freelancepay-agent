"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import Nav from "../Nav";

export default function AgentPage() {
  const account = useActiveAccount();
  const [agentUri, setAgentUri] = useState("");
  const [agentId, setAgentId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!account) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center p-8">
          <p className="text-gray-400 text-xl">
            Please connect your wallet first.
          </p>
        </main>
      </>
    );
  }

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const { registerAgentOnChain } = await import("../../lib/reputation");
      const newAgentId = await registerAgentOnChain(agentUri || "");
      if (!newAgentId) {
        throw new Error("Failed to get agent ID");
      }

      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          agentId: newAgentId,
          agentUri,
        }),
      });

      setAgentId(newAgentId);
      alert(`Agent registered! Agent ID: ${newAgentId}`);
    } catch (e) {
      const message =
        e?.message || (typeof e === "string" ? e : JSON.stringify(e));
      console.error("Agent registration failed:", e);
      setError(message);
      alert(`Failed to register agent: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
            Agent Registry
          </h1>
          <div className="space-y-6 bg-gray-800 p-8 rounded-2xl shadow-2xl">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Agent Metadata URI
              </label>
              <input
                type="text"
                placeholder="ipfs://... or https://..."
                value={agentUri}
                onChange={(e) => setAgentUri(e.target.value)}
                className="w-full p-4 bg-gray-700 rounded-xl border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register Agent"}
            </button>
            {error && (
              <p className="text-sm text-red-400 break-words">{error}</p>
            )}
            {agentId && (
              <p className="text-center text-green-400">
                Agent ID: {agentId}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
