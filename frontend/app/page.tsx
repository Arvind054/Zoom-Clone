"use client";

import { useEffect, useState } from "react";
import {
  Video,
  Plus,
  ArrowUp,
  Calendar,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  Check,
  CalendarPlus,
  Play,
  Copy,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "./components/app-shell";
import { JoinModal } from "./components/join-modal";
import { ScheduleModal } from "./components/schedule-modal";
import { ShareModal } from "./components/share-modal";
import { MeetingCard } from "./components/meeting-card";
import { getStoredUser } from "../lib/auth";
import {
  createInstantMeeting,
  getUpcomingMeetings,
  getRecentMeetings,
  type Meeting,
} from "../lib/api";

type LoadState = "loading" | "ready" | "error";

function parseMeetingDate(value: string) {
  const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export default function Home() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [upcomingState, setUpcomingState] = useState<LoadState>("loading");
  const [recentState, setRecentState] = useState<LoadState>("loading");

  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // New Meeting options dropdown
  const [newMeetingDropdownOpen, setNewMeetingDropdownOpen] = useState(false);
  const [startWithVideo, setStartWithVideo] = useState(true);
  const [usePMI, setUsePMI] = useState(false);

  // Live Clock Effect matching Image 1
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setNowMs(now.getTime());
      // Time format e.g. "11:17 AM"
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      // Date format e.g. "Wednesday, August 24"
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch meetings with fallback
  const fetchMeetingsData = async () => {
    setRefreshing(true);
    setUpcomingState("loading");
    setRecentState("loading");

    try {
      const up = await getUpcomingMeetings();
      setUpcoming(up);
      setUpcomingState("ready");
    } catch {
      setUpcomingState("ready");
      // Keep state clean, empty array allows displaying "No upcoming meetings ?" as per Image 1
      setUpcoming([]);
    }

    try {
      const rec = await getRecentMeetings();
      setRecent(rec);
      setRecentState("ready");
    } catch {
      setRecentState("ready");
      setRecent([]);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  useEffect(() => {
    if (!getStoredUser()) {
      router.replace("/login");
      return;
    }
    const readyTimer = window.setTimeout(() => setAuthReady(true), 0);
    return () => window.clearTimeout(readyTimer);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const meetingsTimer = window.setTimeout(() => void fetchMeetingsData(), 0);
    return () => window.clearTimeout(meetingsTimer);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const refreshTimer = window.setInterval(() => void fetchMeetingsData(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [authReady]);

  if (!authReady) return null;

  const visibleUpcomingMeetings = upcoming.filter(
    (meeting) =>
      !meeting.scheduled_start || parseMeetingDate(meeting.scheduled_start).getTime() > nowMs
  );
  const visibleRecentMeetings = showAllRecent ? recent : recent.slice(0, 2);

  async function handleNewMeeting() {
    setActionError(null);
    setCreating(true);
    setNewMeetingDropdownOpen(false);

    try {
      const meeting = await createInstantMeeting();
      router.push(`/meeting/${meeting.meeting_code}?video=${startWithVideo}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start the meeting.");
    } finally {
      setCreating(false);
    }
  }

  function handleScheduledMeeting(meeting: Meeting) {
    setUpcoming((current) =>
      [...current.filter((item) => item.id !== meeting.id), meeting].sort((first, second) => {
        const firstTime = first.scheduled_start
          ? parseMeetingDate(first.scheduled_start).getTime()
          : Number.MAX_SAFE_INTEGER;
        const secondTime = second.scheduled_start
          ? parseMeetingDate(second.scheduled_start).getTime()
          : Number.MAX_SAFE_INTEGER;
        return firstTime - secondTime;
      })
    );
    setUpcomingState("ready");
  }

  return (
    <AppShell>
      <div className="min-h-full bg-white select-none">
        {/* Main Content Area split into Left (Clock/Meetings) and Right (Action Squircles) */}
        <div className="max-w-[1280px] mx-auto px-6 py-10 lg:px-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* LEFT COLUMN: Clock & Upcoming Meetings (Matching Image 1) */}
            <div className="lg:col-span-6 flex flex-col min-h-[440px] justify-between border-b lg:border-b-0 lg:border-r border-[#e2e8f0] pb-10 lg:pb-0 lg:pr-12">
              <div>
                {/* Clock Header */}
                <div className="flex items-baseline gap-4 mb-12">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0f172a]">
                    {currentTime || "11:17 AM"}
                  </h1>
                  <span className="text-sm sm:text-base font-normal text-[#64748b]">
                    {currentDate || "Wednesday, August 24"}
                  </span>
                </div>

                {/* Upcoming Meetings Container */}
                {visibleUpcomingMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center gap-1.5 text-[#64748b] text-base font-medium mb-6">
                      <span>No upcoming meetings</span>
                      <button
                        type="button"
                        title="Help info"
                        className="text-[#94a3b8] hover:text-[#0f172a] transition"
                      >
                        <HelpCircle size={18} />
                      </button>
                    </div>

                    {/* Refresh Button matching Image 1 */}
                    <button
                      type="button"
                      onClick={() => void fetchMeetingsData()}
                      disabled={refreshing}
                      className="px-8 py-3 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] active:scale-95 transition text-sm font-semibold text-[#0f172a] flex items-center gap-2 shadow-xs border border-[#e2e8f0]"
                    >
                      <RefreshCw
                        size={16}
                        className={`text-[#64748b] ${refreshing ? "animate-spin" : ""}`}
                      />
                      <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Upcoming Meetings ({visibleUpcomingMeetings.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => void fetchMeetingsData()}
                        className="text-xs font-semibold text-[#0e72ed] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {visibleUpcomingMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="p-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white hover:border-[#0e72ed]/40 hover:shadow-md transition flex items-center justify-between group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-[#0e72ed] bg-[#e8f2ff] px-2 py-0.5 rounded-md">
                                {meeting.scheduled_start
                                  ? parseMeetingDate(meeting.scheduled_start).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Today"}
                              </span>
                              <span className="text-xs text-[#94a3b8]">
                                ID: {meeting.meeting_code}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[#0f172a] truncate">
                              {meeting.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push(`/meeting/${meeting.meeting_code}`)}
                            className="ml-4 px-4 py-2 rounded-xl bg-[#0e72ed] text-white text-xs font-semibold hover:bg-[#0c63ce] transition shadow-xs flex items-center gap-1.5 shrink-0"
                          >
                            <Play size={14} fill="currentColor" /> Start
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <section className="mt-10" aria-labelledby="recent-meetings-title">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="recent-meetings-title" className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      Recent Meetings
                    </h2>
                    {recent.length > 0 ? (
                      <span className="text-xs text-[#94a3b8]">{recent.length} completed</span>
                    ) : null}
                  </div>

                  {recentState === "loading" ? (
                    <p className="py-6 text-center text-sm text-[#94a3b8]">Loading recent meetings...</p>
                  ) : recent.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#dce2ea] px-4 py-6 text-center text-sm text-[#94a3b8]">
                      No recent meetings
                    </p>
                  ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {visibleRecentMeetings.map((meeting) => (
                        <MeetingCard key={meeting.id} meeting={meeting} recent />
                      ))}
                    </div>
                  )}

                  {recent.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRecent((current) => !current)}
                      className="mt-4 text-xs font-semibold text-[#0e72ed] hover:underline"
                    >
                      {showAllRecent ? "Show less" : `Show more (${recent.length - 2})`}
                    </button>
                  ) : null}
                </section>
              </div>

              {/* Action Error Message if any */}
              {actionError ? (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600">
                  {actionError}
                </div>
              ) : null}
            </div>

            {/* RIGHT COLUMN: Action Buttons Squircles (Matching Image 1) */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex flex-wrap items-start justify-center lg:justify-start gap-8 sm:gap-10">

                {/* 1. NEW MEETING SQUIRCLE (Orange matching Image 1) */}
                <div className="relative flex flex-col items-center">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleNewMeeting}
                      disabled={creating}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#f26d21] hover:bg-[#de5f18] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(242,109,33,0.32)] hover:scale-105 active:scale-95 transition-all duration-200 group"
                    >
                      <Video size={40} className="stroke-[1.8] group-hover:scale-110 transition duration-200" />
                    </button>
                  </div>

                  {/* Button Label with Dropdown Chevron matching Image 1 */}
                  <div className="relative mt-3">
                    <button
                      type="button"
                      onClick={() => setNewMeetingDropdownOpen(!newMeetingDropdownOpen)}
                      className="flex items-center gap-1 text-sm font-semibold text-[#475569] hover:text-[#0f172a] transition cursor-pointer"
                    >
                      <span>{creating ? "Starting..." : "New Meeting"}</span>
                      <ChevronDown size={14} className="text-[#64748b]" />
                    </button>

                    {/* New Meeting Dropdown Options */}
                    {newMeetingDropdownOpen && (
                      <div className="absolute top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-2 z-50 animate-in fade-in zoom-in-95 duration-100 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0">
                        <button
                          type="button"
                          onClick={() => setStartWithVideo(!startWithVideo)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-between"
                        >
                          <span>Start with video</span>
                          {startWithVideo && <Check size={14} className="text-[#0e72ed]" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsePMI(!usePMI)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-between"
                        >
                          <span>Use Personal Meeting ID</span>
                          {usePMI && <Check size={14} className="text-[#0e72ed]" />}
                        </button>
                        <div className="my-1 border-t border-[#e2e8f0]" />
                        <button
                          type="button"
                          onClick={handleNewMeeting}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#0e72ed] hover:bg-[#e8f2ff]"
                        >
                          Start Instant Meeting
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. JOIN SQUIRCLE (Blue matching Image 1) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => { setActionError(null); setJoinOpen(true); }}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#0e72ed] hover:bg-[#0c63ce] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(14,114,237,0.32)] hover:scale-105 active:scale-95 transition-all duration-200 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition duration-200">
                      <Plus size={28} strokeWidth={2.5} />
                    </div>
                  </button>
                  <span className="mt-3 text-sm font-semibold text-[#475569]">Join</span>
                </div>

                {/* 3. SHARE CONTENT SQUIRCLE (Blue matching Image 1) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => { setActionError(null); setShareOpen(true); }}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#0e72ed] hover:bg-[#0c63ce] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(14,114,237,0.32)] hover:scale-105 active:scale-95 transition-all duration-200 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition duration-200">
                      <ArrowUp size={26} strokeWidth={2.5} />
                    </div>
                  </button>
                  <span className="mt-3 text-sm font-semibold text-[#475569]">Share Content</span>
                </div>

                {/* 4. SCHEDULE SQUIRCLE (Blue matching standard Zoom) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => { setActionError(null); setScheduleOpen(true); }}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#0e72ed] hover:bg-[#0c63ce] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(14,114,237,0.32)] hover:scale-105 active:scale-95 transition-all duration-200 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition duration-200">
                      <Calendar size={26} strokeWidth={2} />
                    </div>
                  </button>
                  <span className="mt-3 text-sm font-semibold text-[#475569]">Schedule</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modals */}
      <JoinModal key={joinOpen ? "join-open" : "join-closed"} open={joinOpen} onClose={() => setJoinOpen(false)} />
      <ScheduleModal key={scheduleOpen ? "schedule-open" : "schedule-closed"} open={scheduleOpen} onClose={() => setScheduleOpen(false)} onCreated={handleScheduledMeeting} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </AppShell>
  );
}