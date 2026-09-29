import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#172235]"><TopNavbar /><div className="flex min-h-0 flex-1"><Sidebar /><main className="min-w-0 flex-1 overflow-auto">{children}</main></div></div>;
}