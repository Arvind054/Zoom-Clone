"use client";

import { useState } from "react";
import { Home, Users, Settings, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");

  const navItems = [
    { id: "home", label: "Home", icon: Home, href: "/" },
    { id: "contacts", label: "Contacts", icon: Users, href: "#contacts" },
    { id: "settings", label: "Settings", icon: Settings, href: "#settings" },
  ];

  return (
    <aside className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col items-center py-6 justify-between select-none">
      {/* Top Main Nav */}
      <div className="flex flex-col items-center w-full space-y-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.id === "home" && pathname === "/") || activeTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors duration-150 group ${
                isActive ? "text-[#0e72ed]" : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-200 ${
                isActive ? "bg-[#e8f2ff]" : "group-hover:bg-[#f1f5f9]"
              }`}>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className={`text-[11px] font-medium mt-1 ${isActive ? "font-semibold text-[#0e72ed]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Help Icon matching Image 1 */}
      <div className="flex flex-col items-center w-full pb-2">
        <button
          type="button"
          title="Help & Support"
          className="flex flex-col items-center justify-center p-2 rounded-full text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
        >
          <HelpCircle size={22} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
