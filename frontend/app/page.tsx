"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Link2, Video, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "./components/app-shell";
import { JoinModal } from "./components/join-modal";
import { MeetingCard } from "./components/meeting-card";
import {
  createInstantMeeting,
  getRecentMeetings,
  getUpcomingMeetings,
  type Meeting,
} from "../lib/api";

type LoadState = "loading" | "ready" | "error";

const actions = [
  {
    label: "New Meeting",
    description: "Start an instant meeting",
    icon: Video,
    className: "bg-[#f0643d] shadow-[0_9px_18px_rgba(240,100,61,0.2)] hover:bg-[#db512e]",
  },
  {
    label: "Join",
    description: "Join with a meeting code",
    icon: Link2,
    className: "bg-[#0b5cff] shadow-[0_9px_18px_rgba(11,92,255,0.18)] hover:bg-[#084dcc]",
  },
  {
    label: "Schedule",
    description: "Plan a meeting for later",
    icon: CalendarPlus,
    className: "bg-[#36a269] shadow-[0_9px_18px_rgba(54,162,105,0.18)] hover:bg-[#2d8c5a]",
  },
];

function MeetingList({
  title,
  meetings,
  state,
  recent = false,
}: {
  title: string;
  meetings: Meeting[];
  state: LoadState;
  recent?: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.02em] text-[#172235]">{title}</h2>
          <p className="mt-1 text-xs text-[#8993a3]">{recent ? "A record of your latest conversations" : "Your next conversations at a glance"}</p>
        </div>
        <button className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#0b5cff] transition hover:bg-[#edf4ff] sm:flex" type="button">View all <span aria-hidden="true">-&gt;</span></button>
      </div>

      {state === "loading" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={`Loading ${title.toLowerCase()}`}>
          {[1, 2, 3].map((item) => <div className="h-[154px] animate-pulse rounded-xl border border-[#e5eaf1] bg-white p-5" key={item}><div className="h-3 w-20 rounded bg-[#edf1f6]" /><div className="mt-6 h-4 w-3/4 rounded bg-[#edf1f6]" /><div className="mt-3 h-3 w-1/2 rounded bg-[#f2f4f7]" /><div className="mt-8 h-3 w-full rounded bg-[#f2f4f7]" /></div>)}
        </div>
      ) : state === "error" ? (
        <div className="rounded-xl border border-dashed border-[#f0c8c2] bg-[#fff9f8] px-5 py-8 text-center"><p className="text-sm font-semibold text-[#ba5146]">Couldn&apos;t load these meetings.</p><p className="mt-1 text-xs text-[#9f7772]">Check that the backend is running, then refresh the page.</p></div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#dce3ec] bg-white px-5 py-9 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5fa] text-[#8993a3]"><CalendarPlus size={18} /></div><p className="mt-3 text-sm font-semibold text-[#354155]">No {recent ? "recent" : "upcoming"} meetings</p><p className="mt-1 text-xs text-[#8993a3]">{recent ? "Your completed meetings will appear here." : "Schedule your next conversation to see it here."}</p></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} recent={recent} />)}</div>
      )}
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [upcomingState, setUpcomingState] = useState<LoadState>("loading");
  const [recentState, setRecentState] = useState<LoadState>("loading");
  const [joinOpen, setJoinOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void getUpcomingMeetings().then((meetings) => { setUpcoming(meetings); setUpcomingState("ready"); }).catch(() => setUpcomingState("error"));
    void getRecentMeetings().then((meetings) => { setRecent(meetings); setRecentState("ready"); }).catch(() => setRecentState("error"));
  }, []);

  async function handleNewMeeting() {
    setActionError(null);
    setCreating(true);
    try {
      const meeting = await createInstantMeeting();
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch {
      setActionError("Could not start a meeting. Check that the backend is running.");
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0b5cff]">Tuesday, September 29</p><h1 className="text-[30px] font-bold tracking-[-0.04em] text-[#172235] sm:text-[36px]">Good morning, Arvind</h1><p className="mt-2 text-sm text-[#768194]">What would you like to do today?</p></div>

        <section aria-label="Meeting actions" className="grid gap-4 sm:grid-cols-3">{actions.map(({ label, description, icon: Icon, className }) => <button aria-busy={label === "New Meeting" ? creating : undefined} className={`group flex min-h-[142px] flex-col items-start justify-between rounded-2xl p-5 text-left text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 ${className}`} disabled={label === "New Meeting" && creating} key={label} onClick={label === "New Meeting" ? handleNewMeeting : label === "Join" ? () => { setActionError(null); setJoinOpen(true); } : undefined} type="button"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icon size={21} strokeWidth={2} /></span><span><span className="block text-lg font-bold tracking-[-0.02em]">{label === "New Meeting" && creating ? "Starting..." : label}</span><span className="mt-1 block text-xs text-white/75">{description}</span></span></button>)}</section>
        {actionError ? <p aria-live="polite" className="mt-3 text-xs font-medium text-[#c35449]">{actionError}</p> : null}

        <div className="my-10 h-px bg-[#e5eaf1]" />
        <div className="space-y-11">
          <MeetingList title="Upcoming meetings" meetings={upcoming} state={upcomingState} />
          <MeetingList title="Recent meetings" meetings={recent} state={recentState} recent />
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-lg border border-[#e6eaf0] bg-white px-4 py-3 text-xs text-[#768194]"><Users size={15} className="text-[#0b5cff]" /> Invite your teammates to collaborate in your workspace.</div>
      </div>
      <JoinModal key={joinOpen ? "join-open" : "join-closed"} onClose={() => setJoinOpen(false)} open={joinOpen} />
    </AppShell>
  );
}