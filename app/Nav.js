"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "thirdweb/react";
import { client } from "../lib/thirdweb";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          FreelancePay Agent
        </Link>
        <div className="flex gap-4">
          <Link
            href="/post-job"
            className={`px-4 py-2 rounded ${
              pathname === "/post-job"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/post-job" ? "page" : undefined}
          >
            Post Job
          </Link>
          <Link
            href="/client"
            className={`px-4 py-2 rounded ${
              pathname === "/client"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/client" ? "page" : undefined}
          >
            My Jobs
          </Link>
          <Link
            href="/browse-jobs"
            className={`px-4 py-2 rounded ${
              pathname === "/browse-jobs"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/browse-jobs" ? "page" : undefined}
          >
            Browse Jobs
          </Link>
          <Link
            href="/dispute"
            className={`px-4 py-2 rounded ${
              pathname === "/dispute"
                ? "bg-yellow-600 text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/dispute" ? "page" : undefined}
          >
            Dispute
          </Link>
          <Link
            href="/agent"
            className={`px-4 py-2 rounded ${
              pathname === "/agent"
                ? "bg-indigo-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/agent" ? "page" : undefined}
          >
            Agent
          </Link>
        </div>
        <div className="ml-4">
          <ConnectButton
            client={client}
            className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          />
        </div>
      </div>
    </nav>
  );
}
