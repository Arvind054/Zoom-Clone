import { Bell, ChevronDown, Settings } from "lucide-react";

export function TopNavbar() {
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-[#e6eaf0] bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0b5cff] shadow-[0_5px_12px_rgba(11,92,255,0.2)]"><span className="text-lg font-bold tracking-[-0.08em] text-white">Z</span></div>
        <span className="text-[17px] font-bold tracking-[-0.03em] text-[#172235]">zoom<span className="text-[#0b5cff]">.work</span></span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button aria-label="Notifications" className="relative rounded-lg p-2 text-[#6d7788] transition hover:bg-[#f2f5f9] hover:text-[#172235]" title="Notifications" type="button"><Bell size={19} strokeWidth={1.8} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f45d48] ring-2 ring-white" /></button>
        <button aria-label="Settings" className="rounded-lg p-2 text-[#6d7788] transition hover:bg-[#f2f5f9] hover:text-[#172235]" title="Settings" type="button"><Settings size={19} strokeWidth={1.8} /></button>
        <div className="ml-1 hidden h-7 w-px bg-[#e6eaf0] sm:block" />
        <button className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 transition hover:bg-[#f5f7fa]" type="button">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-bold text-[#0b5cff]">AC</span>
          <span className="hidden text-left sm:block"><span className="block text-xs font-semibold leading-4 text-[#172235]">Arvind Choudhary</span><span className="block text-[11px] leading-4 text-[#8993a3]">Personal workspace</span></span>
          <ChevronDown className="hidden text-[#8993a3] sm:block" size={15} />
        </button>
      </div>
    </header>
  );
}