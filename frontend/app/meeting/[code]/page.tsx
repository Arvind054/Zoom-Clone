"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, type RefObject } from "react";
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

const PARTICIPANT_POLL_MS = 2000;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function namesMatch(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function dedupeParticipants(list: Participant[]) {
  const byId = new Map<number, Participant>();
  for (const participant of list) {
    byId.set(participant.id, participant);
  }
  const byName = new Map<string, Participant>();
  for (const participant of byId.values()) {
    const key = participant.display_name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || participant.id > existing.id) {
      byName.set(key, participant);
    }
  }
  return Array.from(byName.values()).sort(
    (first, second) => new Date(first.joined_at).getTime() - new Date(second.joined_at).getTime(),
  );
}

function gridClassForCount(count: number) {
  if (count <= 1) return "grid-cols-1 max-w-4xl mx-auto";
  if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto";
}

export default function MeetingRoom() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const participantIdsRef = useRef<Set<number> | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const displayNameRef = useRef<string | null>(null);
  const joinedRef = useRef(false);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.sessionStorage.getItem("zoom-display-name") : null,
  );
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(() =>
    typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia
      ? "Camera and microphone access is not available in this browser."
      : null,
  );
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const visibleParticipants = dedupeParticipants(participants);

  useEffect(() => {
    displayNameRef.current = displayName;
    joinedRef.current = joined;
  }, [displayName, joined]);

  const refreshParticipants = useCallback(async () => {
    const result = await getMeetingParticipants(code);
    const next = dedupeParticipants(result.participants);
    const nextIds = new Set(next.map((participant) => participant.id));
    const previousIds = participantIdsRef.current;

    if (previousIds) {
      const joinedParticipant = next.find((participant) => !previousIds.has(participant.id));
      if (joinedParticipant && displayNameRef.current && !namesMatch(joinedParticipant.display_name, displayNameRef.current)) {
        setToast(`${joinedParticipant.display_name} joined`);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
      }

    }

    participantIdsRef.current = nextIds;
    setParticipants(next);
  }, [code]);

  useEffect(() => {
    if (!displayName) return;
    let active = true;
    void joinMeeting(code, { display_name: displayName })
      .then((self) => {
        if (!active) return;
        setJoined(true);
        setParticipants((current) => {
          const next = dedupeParticipants([...current, self]);
          participantIdsRef.current = new Set(next.map((participant) => participant.id));
          return next;
        });
      })
      .catch(() => {
        if (active) setJoinError("We could not join this meeting. Please check the link and try again.");
      });
    return () => {
      active = false;
    };
  }, [code, displayName]);

  useEffect(() => {
    let active = true;
    void getMeeting(code)
      .then((result) => {
        if (active) setMeeting(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    if (!joined) return;
    let active = true;

    async function pollParticipants() {
      if (!active) return;
      try {
        await refreshParticipants();
      } catch {
        // The room remains usable while a participant poll is temporarily unavailable.
      }
    }

    void pollParticipants();
    const interval = window.setInterval(() => void pollParticipants(), PARTICIPANT_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [joined, refreshParticipants]);

  useEffect(() => {
    if (!joined) return;
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      return () => {
        active = false;
      };
    }
    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((mediaAccessError: DOMException) => {
        if (active) {
          setMediaError(
            mediaAccessError.name === "NotAllowedError"
              ? "Camera and microphone access was denied. You can still stay in the meeting."
              : "Camera and microphone could not be started.",
          );
        }
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [joined]);

  useEffect(() => {
    if (!joined || !displayName) return;

    function handleLeave() {
      if (!joinedRef.current || !displayNameRef.current) return;
      void leaveMeeting(code, displayNameRef.current).catch(() => undefined);
    }

    window.addEventListener("pagehide", handleLeave);
    return () => window.removeEventListener("pagehide", handleLeave);
  }, [code, displayName, joined]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }

  function toggleMute() {
    const nextMuted = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }

  function toggleVideo() {
    const nextEnabled = !videoEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
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

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--zoom-meeting-bg)] text-white">
        <LoaderCircle className="animate-spin" size={24} />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-[var(--zoom-meeting-bg)] px-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">Meeting unavailable</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em]">We couldn&apos;t find that room.</h1>
        <button
          className="mt-7 flex items-center gap-2 rounded-[var(--radius-sm)] bg-white px-4 py-2.5 text-sm font-semibold text-[#131619] transition hover:bg-[#f3f4f6]"
          onClick={() => router.push("/")}
          type="button"
        >
          <ArrowLeft size={16} /> Back home
        </button>
      </div>
    );
  }

  if (!displayName || !joined) {
    return (
      <JoinRoomGate
        code={code}
        error={joinError}
        onJoin={(name) => {
          window.sessionStorage.setItem("zoom-display-name", name);
          setJoinError(null);
          setDisplayName(name);
        }}
        onBack={() => router.push("/")}
      />
    );
  }

  const tileCount = Math.max(visibleParticipants.length, 1);

  return (
    <main className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--zoom-meeting-bg)] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[var(--zoom-meeting-bar)] px-3 sm:h-[52px] sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            aria-label="Back to dashboard"
            className="rounded-[var(--radius-sm)] p-2 text-[#b4bcc6] transition hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/")}
            title="Back to dashboard"
            type="button"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{meeting.title}</p>
            <p className="truncate text-[11px] text-[#9ca3af]">ID {code}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-[#e5e7eb] transition hover:border-white/20 hover:bg-white/10 sm:px-3 sm:py-2"
            onClick={copyInviteLink}
            type="button"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button
            aria-label="More meeting options"
            className="rounded-[var(--radius-sm)] p-2 text-[#b4bcc6] transition hover:bg-white/10 hover:text-white"
            title="More options"
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
        <div className={`grid h-full min-h-0 w-full flex-1 auto-rows-fr gap-2 sm:gap-3 ${gridClassForCount(tileCount)}`}>
          {visibleParticipants.length === 0 ? (
            <ParticipantTile
              displayName={displayName}
              isLocal
              mediaError={mediaError}
              muted={muted}
              videoEnabled={videoEnabled}
              videoRef={videoRef}
            />
          ) : (
            visibleParticipants.map((participant) => {
              const isLocal = namesMatch(participant.display_name, displayName);
              return (
                <ParticipantTile
                  displayName={participant.display_name}
                  isLocal={isLocal}
                  key={participant.id}
                  mediaError={isLocal ? mediaError : null}
                  muted={isLocal ? muted : participant.is_muted}
                  videoEnabled={isLocal ? videoEnabled : false}
                  videoRef={isLocal ? videoRef : undefined}
                />
              );
            })
          )}
        </div>
        {mediaError ? (
          <div className="mt-2 flex shrink-0 items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[#7a4a42] bg-[#3a2729] px-3 py-2.5 text-xs text-[#ffc1b6] sm:px-4 sm:py-3">
            <span>{mediaError}</span>
            <button
              className="shrink-0 font-semibold text-white underline underline-offset-2"
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
      </section>

      <div className="flex h-[72px] shrink-0 items-center justify-center border-t border-white/10 bg-[var(--zoom-meeting-bar)] px-2 sm:h-20 sm:px-4">
        <div className="flex max-w-full items-center gap-0.5 overflow-x-auto sm:gap-1">
          <ToolbarButton icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} onClick={toggleMute} active={muted} />
          <ToolbarButton
            icon={videoEnabled ? Video : VideoOff}
            label={videoEnabled ? "Stop Video" : "Start Video"}
            onClick={toggleVideo}
            active={!videoEnabled}
          />
          <ToolbarButton icon={Users} label="Participants" onClick={() => setPanelOpen((value) => !value)} active={panelOpen} />
          <ToolbarButton icon={MessageSquare} label="Chat" onClick={() => showToast("Chat is not available yet")} />
          <ToolbarButton icon={ScreenShare} label="Share" onClick={() => showToast("Screen sharing is not available yet")} />
          <button
            className="ml-1 flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--zoom-red)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--zoom-red-hover)] sm:ml-3 sm:h-11 sm:px-5"
            disabled={leaving}
            onClick={handleLeave}
            type="button"
          >
            <PhoneOff size={17} />
            <span className="hidden sm:inline">{leaving ? "Leaving..." : "Leave"}</span>
          </button>
        </div>
      </div>

      {panelOpen ? (
        <aside className="fixed bottom-[72px] right-0 top-14 z-10 flex w-full max-w-[320px] flex-col border-l border-white/10 bg-[#2d2d2d] shadow-[-12px_0_32px_rgba(0,0,0,0.35)] sm:bottom-20 sm:max-w-[360px]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Participants</h2>
              <p className="mt-0.5 text-xs text-[#9ca3af]">{visibleParticipants.length} in meeting</p>
            </div>
            <button
              aria-label="Close participants panel"
              className="rounded-[var(--radius-sm)] p-2 text-[#b4bcc6] transition hover:bg-white/10 hover:text-white"
              onClick={() => setPanelOpen(false)}
              title="Close panel"
              type="button"
            >
              <X size={17} />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
            {visibleParticipants.length === 0 ? (
              <p className="rounded-[var(--radius-sm)] bg-white/5 px-3 py-4 text-xs text-[#9ca3af]">Waiting for participants...</p>
            ) : (
              visibleParticipants.map((participant) => (
                <div
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition hover:bg-white/5"
                  key={participant.id}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0e72ed]/30 text-xs font-semibold text-[#dbeafe]">
                    {getInitials(participant.display_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#f3f4f6]">
                      {participant.display_name}
                      {namesMatch(participant.display_name, displayName) ? " (You)" : ""}
                    </p>
                  </div>
                  {(namesMatch(participant.display_name, displayName) ? muted : participant.is_muted) ? (
                    <MicOff className="shrink-0 text-[#f87171]" size={15} />
                  ) : (
                    <Mic className="shrink-0 text-[#9ca3af]" size={15} />
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      ) : null}

      {toast ? (
        <div
          aria-live="polite"
          className="fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#2d2d2d]/95 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm"
        >
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" /> {toast}
        </div>
      ) : null}
    </main>
  );
}

function JoinRoomGate({
  code,
  error,
  onJoin,
  onBack,
}: {
  code: string;
  error: string | null;
  onJoin: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) onJoin(name.trim());
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--zoom-meeting-bg)] px-4 py-8 text-white sm:px-5">
      <form
        className="w-full max-w-[420px] rounded-[var(--radius-lg)] border border-white/10 bg-[#2d2d2d] p-6 shadow-[var(--shadow-modal)] sm:p-8"
        onSubmit={submit}
      >
        <button
          className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#b4bcc6] transition hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#60a5fa]">Join meeting</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em]">Enter your display name</h1>
        <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
          Meeting <span className="font-semibold text-white">{code}</span>
        </p>
        <label className="mt-6 block">
          <span className="mb-2 block text-xs font-semibold text-[#e5e7eb]">Display name</span>
          <input
            autoFocus
            className="w-full rounded-[var(--radius-md)] border border-white/10 bg-[#1a1a1a] px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#6b7280] focus:border-[#0e72ed] focus:ring-2 focus:ring-[#0e72ed]/30"
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            value={name}
          />
        </label>
        {error ? (
          <p aria-live="polite" className="mt-3 text-xs font-medium text-[#fca5a5]">
            {error}
          </p>
        ) : null}
        <button
          className="mt-5 w-full rounded-[var(--radius-md)] bg-[var(--zoom-blue)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--zoom-blue-hover)] disabled:cursor-not-allowed disabled:bg-[#4b5563]"
          disabled={!name.trim()}
          type="submit"
        >
          Join
        </button>
      </form>
    </main>
  );
}

function ParticipantTile({
  displayName,
  isLocal,
  videoRef,
  videoEnabled,
  muted,
  mediaError,
}: {
  displayName: string;
  isLocal: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
  videoEnabled: boolean;
  muted: boolean;
  mediaError: string | null;
}) {
  const showVideo = isLocal && videoEnabled && !mediaError;

  return (
    <div className="relative flex min-h-0 w-full min-w-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--zoom-meeting-tile)] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      {showVideo ? (
        <video
          autoPlay
          className="h-full w-full object-cover [transform:scaleX(-1)]"
          muted
          playsInline
          ref={videoRef}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0e72ed]/25 text-xl font-semibold text-[#dbeafe] sm:h-20 sm:w-20 sm:text-2xl">
            {getInitials(displayName)}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-[6px] bg-black/55 px-2 py-1 text-[11px] font-medium backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1.5 sm:text-xs">
        <span className="truncate">{displayName}{isLocal ? " (You)" : ""}</span>
        {muted ? <MicOff className="shrink-0 text-[#f87171]" size={13} /> : <Mic className="shrink-0" size={13} />}
      </div>
      {isLocal && !videoEnabled && !mediaError ? (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-[#fca5a5] sm:text-[11px]">
          Camera off
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[10px] font-medium transition sm:min-w-[68px] sm:gap-1 sm:px-3 sm:py-2 sm:text-[11px] ${
        active ? "bg-white/15 text-white" : "text-[#d1d5db] hover:bg-white/10 hover:text-white"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className="flex h-7 items-center sm:h-8">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="hidden max-w-[72px] truncate sm:block">{label}</span>
    </button>
  );
}
