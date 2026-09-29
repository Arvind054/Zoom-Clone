"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, LoaderCircle, PhoneOff, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { getMeeting, leaveMeeting, type Meeting } from "../../../lib/api";

export default function MeetingRoom() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void getMeeting(code).then(setMeeting).catch(() => setError(true)).finally(() => setLoading(false));
  }, [code]);

  async function handleLeave() {
    await leaveMeeting(code).catch(() => undefined);
    router.push("/");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#10244b] text-white"><LoaderCircle className="animate-spin" size={24} /></div>;
  }

  if (error || !meeting) {
    return <div className="flex min-h-screen flex-col items-center justify-center bg-[#10244b] px-6 text-center text-white"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9fbfff]">Meeting unavailable</p><h1 className="mt-3 text-2xl font-bold">We couldn&apos;t find that room.</h1><button className="mt-7 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#17346f]" onClick={() => router.push("/")} type="button"><ArrowLeft size={16} /> Back home</button></div>;
  }

  return <main className="flex min-h-screen flex-col bg-[#10244b] text-white"><header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8"><button className="flex items-center gap-2 text-sm font-semibold text-[#b9c8e5] transition hover:text-white" onClick={() => router.push("/")} type="button"><ArrowLeft size={16} /> Leave room</button><span className="text-sm font-bold tracking-[-0.02em]">zoom<span className="text-[#8fb3ff]">.work</span></span><button aria-label="Copy meeting code" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-[#dce7ff] transition hover:bg-white/15" onClick={() => void navigator.clipboard?.writeText(code)} title="Copy meeting code" type="button"><Copy size={14} /> {code}</button></header><section className="flex flex-1 items-center justify-center px-5 py-10"><div className="w-full max-w-[760px] text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-[#a6c1ff]"><Users size={34} /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#9fbfff]">Live meeting</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">{meeting.title}</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#b9c8e5]">Your meeting room is ready. Share the code with the people you&apos;d like to invite.</p><div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold tracking-[0.12em] text-white">{code}</div><button className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#f0643d] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(240,100,61,0.2)] transition hover:bg-[#db512e]" onClick={handleLeave} type="button"><PhoneOff size={16} /> End meeting</button></div></section></main>;
}