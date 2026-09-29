"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarPlus, Clock3, Plus, Video } from "lucide-react";

import { AppShell } from "./components/app-shell";
import { getUpcomingMeetings, type Meeting } from "../lib/api";

function formatMeetingTime(value: string | null) {
  if (!value) return "Time to be confirmed";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function Home() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    void getUpcomingMeetings().then(setUpcoming).catch(() => setApiError(true));
  }, []);

  const nextMeeting = upcoming[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0b5cff]">Tuesday, September 29</p><h1 className="text-[30px] font-bold tracking-[-0.04em] text-[#172235] sm:text-[36px]">Good morning, Arvind</h1><p className="mt-2 text-sm text-[#768194]">Here&apos;s what&apos;s happening across your workspace.</p></div>
          <div className="flex gap-2"><button className="flex items-center gap-2 rounded-[10px] border border-[#dce2ea] bg-white px-4 py-2.5 text-sm font-semibold text-[#354155] shadow-sm transition hover:border-[#b9c8df] hover:bg-[#fbfcfe]" type="button"><CalendarPlus size={16} /> Schedule</button><button className="flex items-center gap-2 rounded-[10px] bg-[#0b5cff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(11,92,255,0.2)] transition hover:bg-[#084dcc]" type="button"><Video size={16} /> New meeting</button></div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div className="relative overflow-hidden rounded-2xl bg-[#10244b] p-6 text-white shadow-[0_12px_30px_rgba(24,46,88,0.14)] sm:p-8"><div className="relative z-10 max-w-[460px]"><div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9fbfff]"><span className="h-2 w-2 rounded-full bg-[#53d59b]" /> Next on your calendar</div>{nextMeeting ? <><h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">{nextMeeting.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-[#b9c8e5]"><Clock3 size={15} /> {formatMeetingTime(nextMeeting.scheduled_start)} · {nextMeeting.duration_min} min</p><button className="mt-8 flex items-center gap-2 rounded-[9px] bg-white px-4 py-2.5 text-sm font-bold text-[#17346f] transition hover:bg-[#eaf1ff]" type="button">View meeting <ArrowUpRight size={16} /></button></> : <><h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">Your calendar is clear</h2><p className="mt-3 text-sm leading-6 text-[#b9c8e5]">Schedule your next conversation or start an instant room.</p><button className="mt-8 flex items-center gap-2 rounded-[9px] bg-white px-4 py-2.5 text-sm font-bold text-[#17346f] transition hover:bg-[#eaf1ff]" type="button"><Plus size={16} /> Create a meeting</button></>}</div><div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[30px] border-[#244985] opacity-60" /><div className="absolute -bottom-28 right-28 h-64 w-64 rounded-full border-[20px] border-[#1b376d] opacity-70" /></div>
          <div className="rounded-2xl border border-[#e6eaf0] bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8993a3]">This week</p><div className="mt-5 flex items-end gap-2"><span className="text-[42px] font-bold leading-none tracking-[-0.06em] text-[#172235]">{upcoming.length}</span><span className="mb-1 text-sm text-[#768194]">upcoming meetings</span></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-[#edf1f6]"><div className="h-full w-[62%] rounded-full bg-[#0b5cff]" /></div><div className="mt-3 flex justify-between text-[11px] text-[#8993a3]"><span>Focus time</span><span>62% scheduled</span></div>{apiError ? <p className="mt-5 text-xs font-medium text-[#d5544b]">Connect the backend to load your calendar.</p> : null}</div>
        </section>

        <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold tracking-[-0.02em] text-[#172235]">Upcoming meetings</h2><button className="flex items-center gap-1 text-xs font-bold text-[#0b5cff]" type="button">View calendar <ArrowUpRight size={14} /></button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{upcoming.slice(0, 3).map((meeting) => <article className="group rounded-xl border border-[#e6eaf0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#c6d5ee] hover:shadow-[0_8px_20px_rgba(34,56,92,0.07)]" key={meeting.id}><div className="flex items-start justify-between gap-3"><span className="rounded-md bg-[#edf4ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0b5cff]">Scheduled</span><button aria-label={`Open ${meeting.title}`} className="text-[#9ca6b5] opacity-0 transition group-hover:opacity-100" title="Open meeting" type="button"><ArrowUpRight size={16} /></button></div><h3 className="mt-4 truncate text-sm font-bold text-[#273449]">{meeting.title}</h3><p className="mt-2 text-xs text-[#768194]">{formatMeetingTime(meeting.scheduled_start)}</p><div className="mt-4 flex items-center gap-2 border-t border-[#eef1f5] pt-3 text-[11px] text-[#8993a3]"><Clock3 size={13} /> {meeting.duration_min} minutes <span className="ml-auto">{meeting.meeting_code}</span></div></article>)}{!upcoming.length && !apiError ? <p className="text-sm text-[#768194]">No upcoming meetings yet.</p> : null}</div></section>
      </div>
    </AppShell>
  );
}
