"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Settings, ChevronDown, Check, LogOut, User as UserIcon } from "lucide-react";
import { getStoredUser, removeUser, type User } from "../../lib/auth";

export function TopNavbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  function handleSignOut() {
    removeUser();
    setCurrentUser(null);
    setStatusMenuOpen(false);
    router.push("/login");
  }

  function handleSetStatus(status: "available" | "busy" | "away") {
    if (currentUser) {
      const updated = { ...currentUser, status };
      setCurrentUser(updated);
    }
    setStatusMenuOpen(false);
  }

  return (
    <header className="h-14 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Brand logo & Search */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0e72ed] flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_12px_rgba(14,114,237,0.3)]">
            z
          </div>
          <span className="font-bold text-lg tracking-tight text-[#0f172a]">
            zoom
          </span>
        </Link>

        {/* Global Search Bar */}
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
          <input
            type="text"
            placeholder="Search meetings, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition relative"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f26d21] rounded-full ring-2 ring-white" />
        </button>

        <button
          type="button"
          className="p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
          title="Settings"
        >
          <Settings size={18} />
        </button>

        <div className="h-5 w-px bg-[#e2e8f0] mx-1" />

        {/* User Profile or Sign In / Sign Up buttons */}
        {currentUser ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="flex items-center gap-2.5 p-1 hover:bg-[#f1f5f9] rounded-xl transition"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0e72ed] to-[#38bdf8] text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.initials}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    currentUser.status === "available"
                      ? "bg-emerald-500"
                      : currentUser.status === "busy"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#0f172a] truncate max-w-[120px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-[#64748b] capitalize">{currentUser.status}</div>
              </div>
              <ChevronDown size={14} className="text-[#64748b] hidden sm:block" />
            </button>

            {/* Status Dropdown Menu */}
            {statusMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e2e8f0] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-[#f1f5f9] mb-1">
                  <div className="text-xs font-bold text-[#0f172a] truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-[#64748b] truncate">{currentUser.email}</div>
                </div>

                <div className="px-3 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                  Set Status
                </div>
                <button
                  type="button"
                  onClick={() => handleSetStatus("available")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                  </span>
                  {currentUser.status === "available" && <Check size={14} className="text-[#0e72ed]" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus("busy")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Do Not Disturb
                  </span>
                  {currentUser.status === "busy" && <Check size={14} className="text-[#0e72ed]" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus("away")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-between text-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Away
                  </span>
                  {currentUser.status === "away" && <Check size={14} className="text-[#0e72ed]" />}
                </button>

                <div className="border-t border-[#f1f5f9] mt-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#0f172a] hover:bg-[#f1f5f9] transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-lg bg-[#0e72ed] hover:bg-[#0c63ce] text-xs font-semibold text-white transition shadow-sm"
            >
              Sign Up Free
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}