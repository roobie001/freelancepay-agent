"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../lib/thirdweb";
import Link from "next/link";

export default function Home() {
  const account = useActiveAccount();

  if (account) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-4xl font-bold mb-6">
          FreelancePay Agent Dashboard
        </h1>
        <p className="text-gray-400 mb-8">Welcome! Choose your role:</p>
        <div className="flex gap-4">
          <Link href="/post-job">
            <button className="bg-blue-500 px-6 py-3 rounded-lg text-white font-semibold">
              Post a Job (Client)
            </button>
          </Link>
          <Link href="/browse-jobs">
            <button className="bg-green-500 px-6 py-3 rounded-lg text-white font-semibold">
              Browse Jobs (Freelancer)
            </button>
          </Link>
          <Link href="/dispute">
            <button className="bg-yellow-500 px-6 py-3 rounded-lg text-black font-semibold">
              Resolve Dispute
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">FreelancePay Agent</h1>

      <p className="text-gray-400 text-center max-w-md">
        Protect freelancers with on-chain escrow payments. AI-powered dispute
        resolution.
      </p>

      <ConnectButton client={client} />
    </main>
  );
}
