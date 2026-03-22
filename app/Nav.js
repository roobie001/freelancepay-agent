"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import WalletButton from "./components/WalletButton";
import NotificationsMenu from "./components/NotificationsMenu";

const navLinks = [
  { href: "/post-job", label: "Post Job", active: "bg-blue-600 text-white" },
  { href: "/client", label: "My Jobs", active: "bg-purple-600 text-white" },
  { href: "/browse-jobs", label: "Browse Jobs", active: "bg-green-600 text-white" },
  { href: "/freelancer", label: "Freelancer", active: "bg-teal-600 text-white" },
  { href: "/dispute", label: "Dispute", active: "bg-yellow-600 text-black" },
  { href: "/disputes", label: "Disputes", active: "bg-yellow-500 text-black" },
  { href: "/agent", label: "Agent", active: "bg-indigo-600 text-white" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white text-xl font-bold">
            FreelancePay Agent
          </Link>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex">
              <NotificationsMenu />
            </div>
            <div className="hidden md:flex">
              <WalletButton compact />
            </div>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 text-gray-200"
              aria-label="Toggle menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 bg-gray-200"></span>
                <span className="block h-0.5 w-5 bg-gray-200"></span>
                <span className="block h-0.5 w-5 bg-gray-200"></span>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-4 hidden md:flex flex-wrap gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded text-sm font-semibold ${
                pathname === link.href
                  ? link.active
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {open && (
          <div className="mt-4 flex flex-col gap-2 md:hidden">
            <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
              <NotificationsMenu />
              <WalletButton compact />
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded text-sm font-semibold ${
                  pathname === link.href
                    ? link.active
                    : "bg-gray-800 text-gray-200"
                }`}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
