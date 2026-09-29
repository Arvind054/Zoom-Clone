import { Bell, ChevronDown, Settings } from "lucide-react";

export function TopNavbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--zoom-border)] bg-[var(--zoom-surface)] px-4 sm:h-16 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--zoom-blue)] shadow-[0_4px_10px_rgba(14,114,237,0.22)] sm:h-9 sm:w-9"><span className="text-base font-bold tracking-[-0.08em] text-white sm:text-lg">Z</span></div>
        <span className="text-base font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[17px]">zoom<span className="text-[var(--zoom-blue)]">.work</span></span>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <button aria-label="Notifications" className="relative rounded-[var(--radius-sm)] p-2 text-[var(--zoom-muted)] transition hover:bg-[#f2f5f9] hover:text-[var(--foreground)]" title="Notifications" type="button"><Bell size={19} strokeWidth={1.8} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f45d48] ring-2 ring-white" /></button>
        <button aria-label="Settings" className="rounded-[var(--radius-sm)] p-2 text-[var(--zoom-muted)] transition hover:bg-[#f2f5f9] hover:text-[var(--foreground)]" title="Settings" type="button"><Settings size={19} strokeWidth={1.8} /></button>
        <div className="ml-0.5 hidden h-7 w-px bg-[var(--zoom-border)] sm:block" />
        <button className="flex items-center gap-2 rounded-[var(--radius-md)] p-1.5 pr-2 transition hover:bg-[#f5f7fa] sm:gap-2.5" type="button">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-bold text-[var(--zoom-blue)] sm:h-9 sm:w-9">AC</span>
          <span className="hidden text-left md:block"><span className="block text-xs font-semibold leading-4 text-[var(--foreground)]">Arvind Choudhary</span><span className="block text-[11px] leading-4 text-[var(--zoom-muted)]">Personal workspace</span></span>
          <ChevronDown className="hidden text-[var(--zoom-muted)] md:block" size={15} />
        </button>
      </div>
    </header>
  );
}