"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../lib/thirdweb";
import Link from "next/link";
import Nav from "./Nav";

export default function Home() {
  const account = useActiveAccount();

  if (account) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              FreelancePay Agent Dashboard
            </h1>
            <p className="text-gray-400 mb-8 text-center text-lg">
              Welcome! Choose your role:
            </p>
            <div className="flex gap-6 justify-center flex-wrap">
              <Link href="/post-job">
                <button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  Post a Job (Client)
                </button>
              </Link>
              <Link href="/browse-jobs">
                <button className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  Browse Jobs (Freelancer)
                </button>
              </Link>
              <Link href="/dispute">
                <button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 px-8 py-4 rounded-xl text-black font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  Resolve Dispute
                </button>
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          FreelancePay Agent
        </h1>
        <p className="text-gray-400 text-center max-w-lg text-lg leading-relaxed">
          Protect freelancers with on-chain escrow payments. AI-powered dispute
          resolution.
        </p>
      </div>
      <ConnectButton
        client={client}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
      />
    </main>
  );
}
