"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";

export default function NotificationsMenu() {
  const account = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function load() {
      if (!account?.address) return;
      const res = await fetch(`/api/notifications?address=${account.address}`);
      if (res.ok) {
        setNotifications(await res.json());
      }
    }
    load();
  }, [account, open]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative px-3 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs font-semibold"
      >
        Notifications
        {unread > 0 && (
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-green-500 text-black text-[10px] px-2">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl bg-gray-900 border border-gray-700 shadow-xl z-50">
          <div className="p-3 border-b border-gray-800 text-sm text-gray-300">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {notifications.map((n) => (
                <li key={n.id} className="p-3">
                  <p className="text-sm text-gray-200">{n.title}</p>
                  <p className="text-xs text-gray-400">{n.message}</p>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="mt-2 text-xs text-green-400 hover:text-green-300"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
