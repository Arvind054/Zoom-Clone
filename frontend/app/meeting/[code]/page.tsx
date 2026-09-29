"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  LoaderCircle,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  ScreenShare,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import {
  getMeeting,
  getMeetingParticipants,
  joinMeeting,
  leaveMeeting,
  type Meeting,
  type Participant,
} from "../../../lib/api";

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function MeetingRoom() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const participantIdsRef = useRef<Set<number> | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(() => typeof window !== "undefined" ? window.sessionStorage.getItem("zoom-display-name") : null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(() => typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia ? "Camera and microphone access is not available in this browser." : null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!displayName) return;
    let active = true;
    void joinMeeting(code, { display_name: displayName }).then(() => {
      if (active) setJoined(true);
    }).catch(() => {
      if (active) setJoinError("We could not join this meeting. Please check the link and try again.");
    });
    return () => { active = false; };
  }, [code, displayName]);

  useEffect(() => {
    let active = true;
    void getMeeting(code).then((result) => { if (active) setMeeting(result); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (!joined) return;
    let active = true;
    async function pollParticipants() {
      try {
        const result = await getMeetingParticipants(code);
        if (!active) return;
        const nextIds = new Set(result.participants.map((participant) => participant.id));
        const previousIds = participantIdsRef.current;
        if (previousIds) {
          const joined = result.participants.find((participant) => !previousIds.has(participant.id));
          if (joined) {
            setToast(`${joined.display_name} joined`);
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
            toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
          }
        }
        participantIdsRef.current = nextIds;
        setParticipants(result.participants);
      } catch {
        // The room remains usable while a participant poll is temporarily unavailable.
      }
    }
    void pollParticipants();
    const interval = window.setInterval(() => void pollParticipants(), 3000);
    return () => { active = false; window.clearInterval(interval); if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); };
  }, [code, joined]);

  useEffect(() => {
    if (!joined) return;
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      return () => { active = false; };
    }
    void navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch((mediaAccessError: DOMException) => {
      if (active) setMediaError(mediaAccessError.name === "NotAllowedError" ? "Camera and microphone access was denied. You can still stay in the meeting." : "Camera and microphone could not be started.");
    });
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, [joined]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }

  function toggleMute() {
    const nextMuted = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
  }

  function toggleVideo() {
    const nextEnabled = !videoEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextEnabled; });
    setVideoEnabled(nextEnabled);
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/meeting/${code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleLeave() {
    setLeaving(true);
    await leaveMeeting(code, displayName ?? "").catch(() => undefined);
    router.push("/");
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#111827] text-white"><LoaderCircle className="animate-spin" size={24} /></div>;

  if (error || !meeting) return <div className="flex min-h-screen flex-col items-center justify-center bg-[#111827] px-6 text-center text-white"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#91a8cf]">Meeting unavailable</p><h1 className="mt-3 text-2xl font-bold">We couldn&apos;t find that room.</h1><button className="mt-7 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#172235]" onClick={() => router.push("/")} type="button"><ArrowLeft size={16} /> Back home</button></div>;

  if (!displayName || !joined) return <JoinRoomGate code={code} error={joinError} onJoin={(name) => { window.sessionStorage.setItem("zoom-display-name", name); setJoinError(null); setDisplayName(name); }} onBack={() => router.push("/")} />;

  const otherParticipants = participants.filter((participant) => participant.display_name !== displayName);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#111827] text-white">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="Back to dashboard" className="rounded-lg p-2 text-[#8d9ab1] transition hover:bg-white/[0.08] hover:text-white" onClick={() => router.push("/")} title="Back to dashboard" type="button"><ArrowLeft size={18} /></button><div className="hidden h-6 w-px bg-white/10 sm:block" /><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{meeting.title}</p><p className="text-[11px] text-[#7f8ba0]">Meeting ID: {code}</p></div></div>
        <div className="flex items-center gap-2"><button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#c9d2e2] transition hover:bg-white/[0.09]" onClick={copyInviteLink} type="button">{copied ? <Check size={14} /> : <Copy size={14} />}<span className="hidden sm:inline">{copied ? "Copied" : "Copy invite link"}</span></button><button aria-label="More meeting options" className="rounded-lg p-2 text-[#8d9ab1] transition hover:bg-white/[0.08] hover:text-white" title="More options" type="button"><MoreHorizontal size={19} /></button></div>
      </header>

      <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[104px] pt-5 sm:px-7 sm:pt-7">
        <div className={`mx-auto grid w-full max-w-[1100px] content-center gap-4 ${otherParticipants.length > 0 ? "sm:grid-cols-2" : ""}`}>
          <div className="relative aspect-video max-h-[calc(100dvh-190px)] min-h-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c2638] shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            {videoEnabled && !mediaError ? <video autoPlay className="h-full w-full object-cover [transform:scaleX(-1)]" muted playsInline ref={videoRef} /> : <div className="flex h-full items-center justify-center bg-[#202d42]"><div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#35527c] text-2xl font-bold text-[#d7e5ff]">{getInitials(displayName)}</div></div>}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur-sm"><span>{displayName}</span>{muted ? <MicOff className="text-[#f58a78]" size={14} /> : <Mic size={14} />}</div>
            {!videoEnabled && !mediaError ? <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#f58a78]/15 px-3 py-1 text-[11px] font-bold text-[#ffb2a5]">Camera off</div> : null}
          </div>
          {otherParticipants.map((participant) => <ParticipantTile key={participant.id} participant={participant} />)}
        </div>
        {mediaError ? <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#755047] bg-[#3a2729] px-4 py-3 text-xs text-[#ffc1b6]"><span>{mediaError}</span><button className="shrink-0 font-bold text-white underline underline-offset-2" onClick={() => window.location.reload()} type="button">Try again</button></div> : null}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex h-[88px] items-center justify-center border-t border-white/[0.08] bg-[#151e2d]/95 px-3 backdrop-blur-md sm:h-[96px]">
        <div className="flex items-center gap-1.5 sm:gap-3"><ToolbarButton icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} onClick={toggleMute} active={muted} /><ToolbarButton icon={videoEnabled ? Video : VideoOff} label={videoEnabled ? "Stop Video" : "Start Video"} onClick={toggleVideo} active={!videoEnabled} /><ToolbarButton icon={Users} label="Participants" onClick={() => setPanelOpen((value) => !value)} active={panelOpen} /><ToolbarButton icon={MessageSquare} label="Chat" onClick={() => showToast("Chat is not available yet")} /><ToolbarButton icon={ScreenShare} label="Share" onClick={() => showToast("Screen sharing is not available yet")} /><button className="ml-1 flex h-11 items-center gap-2 rounded-xl bg-[#e45849] px-3 text-xs font-bold text-white transition hover:bg-[#c9473b] sm:ml-4 sm:px-5" disabled={leaving} onClick={handleLeave} type="button"><PhoneOff size={17} /> <span className="hidden sm:inline">{leaving ? "Leaving..." : "Leave"}</span></button></div>
      </div>

      {panelOpen ? <aside className="fixed bottom-[88px] right-0 top-[68px] z-10 w-full max-w-[340px] border-l border-white/[0.08] bg-[#182334] p-5 shadow-[-20px_0_40px_rgba(0,0,0,0.18)] sm:bottom-[96px]"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Participants</h2><p className="mt-1 text-xs text-[#7f8ba0]">{participants.length} in this meeting</p></div><button aria-label="Close participants panel" className="rounded-lg p-2 text-[#8d9ab1] hover:bg-white/[0.08] hover:text-white" onClick={() => setPanelOpen(false)} title="Close panel" type="button"><X size={17} /></button></div><div className="mt-5 space-y-2">{participants.length === 0 ? <p className="rounded-lg bg-white/[0.04] px-3 py-4 text-xs text-[#8d9ab1]">Waiting for participants...</p> : participants.map((participant) => <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3" key={participant.id}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#35527c] text-xs font-bold text-[#d7e5ff]">{getInitials(participant.display_name)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#e1e8f3]">{participant.display_name}{participant.display_name === displayName ? " (You)" : ""}</p><p className="mt-1 text-[10px] text-[#7f8ba0]">Joined {formatJoinedAt(participant.joined_at)}</p></div>{participant.is_muted ? <MicOff className="text-[#f58a78]" size={14} /> : <Mic className="text-[#7f8ba0]" size={14} />}</div>)}</div></aside> : null}
      {toast ? <div aria-live="polite" className="fixed left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#26344a]/95 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm"><span className="h-2 w-2 rounded-full bg-[#53d59b]" /> {toast}</div> : null}
    </main>
  );
}

function JoinRoomGate({ code, error, onJoin, onBack }: { code: string; error: string | null; onJoin: (name: string) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) onJoin(name.trim());
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#111827] px-5 text-white"><form className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#182334] p-7 shadow-2xl" onSubmit={submit}><button className="mb-8 flex items-center gap-2 text-xs font-bold text-[#8d9ab1] transition hover:text-white" onClick={onBack} type="button"><ArrowLeft size={15} /> Back to dashboard</button><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#91a8cf]">Join meeting</p><h1 className="mt-3 text-2xl font-bold tracking-[-0.03em]">How should we call you?</h1><p className="mt-2 text-sm leading-6 text-[#9eabc0]">You are joining meeting <span className="font-bold text-[#d7e5ff]">{code}</span>.</p><label className="mt-7 block"><span className="mb-2 block text-xs font-bold text-[#d7e5ff]">Display name</span><input autoFocus className="w-full rounded-[10px] border border-white/10 bg-[#111827] px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#65738a] focus:border-[#769de0] focus:ring-2 focus:ring-[#314c7f]" onChange={(event) => setName(event.target.value)} placeholder="Your name" value={name} /></label>{error ? <p aria-live="polite" className="mt-3 text-xs font-medium text-[#ff9f91]">{error}</p> : null}<button className="mt-6 w-full rounded-[10px] bg-[#0b5cff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#084dcc] disabled:cursor-not-allowed disabled:bg-[#40577f]" disabled={!name.trim()} type="submit">Join room</button></form></main>;
}

function ParticipantTile({ participant }: { participant: Participant }) {
  return <div className="relative flex min-h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c2638] sm:min-h-[390px]"><div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#35527c] text-2xl font-bold text-[#d7e5ff]">{getInitials(participant.display_name)}</div><div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur-sm"><span className="max-w-[160px] truncate">{participant.display_name}</span>{participant.is_muted ? <MicOff className="text-[#f58a78]" size={14} /> : <Mic size={14} />}</div></div>;
}

function ToolbarButton({ icon: Icon, label, onClick, active = false }: { icon: typeof Mic; label: string; onClick: () => void; active?: boolean }) {
  return <button aria-pressed={active} className={`flex min-w-[54px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition sm:min-w-[72px] sm:px-3 ${active ? "bg-white/12 text-white" : "text-[#aeb9c9] hover:bg-white/[0.08] hover:text-white"}`} onClick={onClick} title={label} type="button"><span className="flex h-7 items-center"><Icon size={18} strokeWidth={1.8} /></span><span className="hidden sm:block">{label}</span></button>;
}