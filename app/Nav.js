"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          FreelancePay Agent
        </Link>
        <div className="flex gap-4">
          <Link href="/post-job">
            <button
              className={`px-4 py-2 rounded ${
                pathname === "/post-job"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Post Job
            </button>
          </Link>
          <Link href="/browse-jobs">
            <button
              className={`px-4 py-2 rounded ${
                pathname === "/browse-jobs"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Browse Jobs
            </button>
          </Link>
          <Link href="/dispute">
            <button
              className={`px-4 py-2 rounded ${
                pathname === "/dispute"
                  ? "bg-yellow-600 text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Dispute
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
