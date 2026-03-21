"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./components/WalletButton";
import NotificationsMenu from "./components/NotificationsMenu";

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
            href="/freelancer"
            className={`px-4 py-2 rounded ${
              pathname === "/freelancer"
                ? "bg-teal-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            aria-current={pathname === "/freelancer" ? "page" : undefined}
          >
            Freelancer
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
          <NotificationsMenu />
        </div>
        <div className="ml-4">
          <WalletButton compact />
        </div>
      </div>
    </nav>
  );
}
