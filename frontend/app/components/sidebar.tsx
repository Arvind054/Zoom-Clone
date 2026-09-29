"use client";

import { useState } from "react";
import { Archive, CalendarDays, ChevronLeft, FileVideo, Grid2X2, Headphones, MessageSquare, Settings, Users, Video } from "lucide-react";

const primaryItems = [{ label: "Home", icon: Grid2X2 }, { label: "Meetings", icon: Video }, { label: "Team Chat", icon: MessageSquare }, { label: "Contacts", icon: Users }];
const workspaceItems = [{ label: "Calendar", icon: CalendarDays }, { label: "Recordings", icon: FileVideo }, { label: "Archive", icon: Archive }];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`hidden shrink-0 border-r border-[#e6eaf0] bg-white transition-[width] duration-200 md:flex md:flex-col ${collapsed ? "w-[76px]" : "w-[232px]"}`}>
      <div className="flex h-full flex-col px-3 py-5">
        <nav aria-label="Main navigation" className="space-y-1"><p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0a8b5] ${collapsed ? "sr-only" : ""}`}>Workspace</p>{primaryItems.map((item, index) => <SidebarItem key={item.label} {...item} active={index === 0} collapsed={collapsed} />)}</nav>
        <nav aria-label="Workspace tools" className="mt-8 space-y-1"><p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0a8b5] ${collapsed ? "sr-only" : ""}`}>Tools</p>{workspaceItems.map((item) => <SidebarItem key={item.label} {...item} collapsed={collapsed} />)}</nav>
        <div className="mt-auto"><div className={`mb-4 rounded-xl bg-[#f1f6ff] p-3 ${collapsed ? "hidden" : ""}`}><div className="mb-2 flex items-center gap-2 text-[#0b5cff]"><Headphones size={15} /><span className="text-xs font-bold">Need a hand?</span></div><p className="text-[11px] leading-4 text-[#6d7c95]">Visit the help center for quick answers.</p><button className="mt-3 text-[11px] font-bold text-[#0b5cff]" type="button">Open help center</button></div><SidebarItem label="Settings" icon={Settings} collapsed={collapsed} /><button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-[#8993a3] transition hover:bg-[#f5f7fa] hover:text-[#172235]" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} type="button"><ChevronLeft className={collapsed ? "rotate-180" : ""} size={16} /></button></div>
      </div>
    </aside>
  );
}
function SidebarItem({ label, icon: Icon, active = false, collapsed }: { label: string; icon: typeof Grid2X2; active?: boolean; collapsed: boolean }) {
  return <button className={`group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? "bg-[#eaf1ff] text-[#0b5cff]" : "text-[#6d7788] hover:bg-[#f5f7fa] hover:text-[#172235]"} ${collapsed ? "justify-center" : ""}`} title={collapsed ? label : undefined} type="button"><Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span className={collapsed ? "sr-only" : ""}>{label}</span>{active && !collapsed ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0b5cff]" /> : null}</button>;
}
