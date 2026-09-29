"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  Copy,
  Grid,
  LoaderCircle,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ShieldCheck,
  Smile,
  Users,
  Video,
  VideoOff,
  X,
  Send,
  UserPlus,
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

type ReactionEmoji = {
  id: number;
  emoji: string;
  left: number;
};

type ChatMessage = {
  id: number;
  sender: string;
  text: string;
  time: string;
  isSelf?: boolean;
};

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-teal-600",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function namesMatch(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function gridLayoutClass(count: number) {
  if (count <= 1) return "grid-cols-1 max-w-2xl h-[480px]";
  if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl h-[420px]";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-5xl auto-rows-fr";
  if (count <= 6) return "grid-cols-2 md:grid-cols-3 max-w-6xl auto-rows-fr";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-7xl auto-rows-fr";
}

export default function MeetingRoom() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code || "zoom-meeting";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.sessionStorage.getItem("zoom-display-name") : null
  );
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Audio/Video Local toggles
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  // Popups & Drawers
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [videoSettingsOpen, setVideoSettingsOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"participants" | "chat" | null>(null);

  // Animated Reactions
  const [floatingEmojis, setFloatingEmojis] = useState<ReactionEmoji[]>([]);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "System", text: "Welcome to the meeting room!", time: "Now" },
  ]);
  const [newChatInput, setNewChatInput] = useState("");

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");

  // Load meeting metadata
  useEffect(() => {
    let active = true;
    getMeeting(code)
      .then((m) => {
        if (active) setMeeting(m);
      })
      .catch(() => {
        if (active) {
          setMeeting({
            id: 1,
            meeting_code: code,
            title: "Project Sync",
            description: "Live meeting session",
            host_id: 1,
            scheduled_start: new Date().toISOString(),
            duration_min: 60,
            status: "live",
            created_at: new Date().toISOString(),
            participants: [],
          });
        }
      });
    return () => {
      active = false;
    };
  }, [code]);

  // Handle Joining & Polling Participants
  const fetchParticipants = useCallback(async () => {
    try {
      const res = await getMeetingParticipants(code);
      if (res.participants) {
        setParticipants(res.participants.filter((p) => p.left_at === null));
      }
    } catch {
      // Keep local state intact if backend API is unreachable
    }
  }, [code]);

  useEffect(() => {
    if (!displayName) return;

    let active = true;
    setJoining(true);

    joinMeeting(code, { display_name: displayName })
      .then((selfParticipant) => {
        if (!active) return;
        setJoined(true);
        setParticipants((current) => {
          const exists = current.some((p) => namesMatch(p.display_name, selfParticipant.display_name));
          if (exists) return current;
          return [...current, selfParticipant];
        });
      })
      .catch(() => {
        // Fallback for offline mode: create local participant record
        if (active) {
          setJoined(true);
          const selfP: Participant = {
            id: Date.now(),
            display_name: displayName,
            role: "host",
            is_muted: muted,
            joined_at: new Date().toISOString(),
            left_at: null,
          };
          setParticipants((current) => {
            const exists = current.some((p) => namesMatch(p.display_name, displayName));
            if (exists) return current;
            return [...current, selfP];
          });
        }
      })
      .finally(() => {
        if (active) setJoining(false);
      });

    return () => {
      active = false;
    };
  }, [code, displayName]);

  // Poll for real participant updates every 2.5 seconds
  useEffect(() => {
    if (!joined) return;
    void fetchParticipants();
    const interval = setInterval(() => {
      void fetchParticipants();
    }, 2500);
    return () => clearInterval(interval);
  }, [joined, fetchParticipants]);

  // Request camera and microphone access
  useEffect(() => {
    if (!joined) return;
    let active = true;

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera access fallback
        });
    }

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [joined]);

  function handleJoinGateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("zoom-display-name", name);
    }
    setDisplayName(name);
  }

  function toggleMute() {
    const nextMuted = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);

    // Update local participant state in list
    if (displayName) {
      setParticipants((prev) =>
        prev.map((p) => (namesMatch(p.display_name, displayName) ? { ...p, is_muted: nextMuted } : p))
      );
    }
  }

  function toggleVideo() {
    const nextEnabled = !videoEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setVideoEnabled(nextEnabled);
  }

  function handleSendReaction(emoji: string) {
    const newEmoji: ReactionEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      left: Math.floor(Math.random() * 80) + 10,
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setReactionsOpen(false);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2200);
  }

  function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!newChatInput.trim()) return;
    const msg: ChatMessage = {
      id: Date.now(),
      sender: displayName || "You",
      text: newChatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewChatInput("");
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/meeting/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeaveMeeting() {
    if (displayName) {
      await leaveMeeting(code, displayName).catch(() => undefined);
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    router.push("/");
  }

  // Add simulated guest for testing multi-participant layout
  function addGuestParticipant() {
    const guestNames = ["Alex Rivera", "Sam Chen", "Taylor Swift", "Jordan Lee", "Morgan Smith"];
    const unused = guestNames.filter((g) => !participants.some((p) => namesMatch(p.display_name, g)));
    const name = unused.length > 0 ? unused[0] : `Guest #${participants.length + 1}`;

    const newP: Participant = {
      id: Date.now(),
      display_name: name,
      role: "participant",
      is_muted: Math.random() > 0.5,
      joined_at: new Date().toISOString(),
      left_at: null,
    };
    setParticipants((prev) => [...prev, newP]);
  }

  // Render Gate if User is not signed in with Display Name
  if (!displayName || !joined) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-[#0f0f12] text-white p-4">
        <form
          onSubmit={handleJoinGateSubmit}
          className="w-full max-w-md bg-[#1c1c21] p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0e72ed]">Zoom Meeting</span>
            <h1 className="text-2xl font-bold text-white mt-1">Ready to join?</h1>
            <p className="text-xs text-gray-400 mt-1">
              Meeting ID: <span className="font-mono text-white font-semibold">{code}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Your Display Name</label>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. Arvind Choudhary"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0e72ed] focus:ring-2 focus:ring-[#0e72ed]/20"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joining || !nameInput.trim()}
              className="flex-1 py-3 rounded-xl bg-[#0e72ed] hover:bg-[#0c63ce] text-xs font-semibold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-[#0e72ed]/20 disabled:opacity-50"
            >
              {joining ? <LoaderCircle size={16} className="animate-spin" /> : "Join Room"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0f0f12] text-white select-none relative">
      
      {/* Floating Animated Reaction Emojis */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%`, bottom: "100px" }}
            className="absolute text-4xl animate-float-emoji drop-shadow-lg"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* TOP MEETING HEADER BAR */}
      <header className="h-12 bg-[#18181b] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-30">
        
        {/* Security / Info Shield Icon */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setInfoModalOpen(!infoModalOpen)}
              className="flex items-center gap-1.5 p-1 rounded-md text-[#22c55e] hover:bg-white/10 transition"
              title="Meeting Information"
            >
              <ShieldCheck size={20} className="fill-[#22c55e]/20" />
            </button>

            {/* Security Info Popup Modal */}
            {infoModalOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-[#242429] rounded-xl shadow-2xl border border-white/10 p-5 z-50 animate-in fade-in duration-100 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#22c55e]" />
                    {meeting?.title || "Meeting Room"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Meeting Code:</span>
                    <span className="font-mono text-white font-semibold">{code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Participants:</span>
                    <span className="text-white font-semibold">{participants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Encryption:</span>
                    <span className="text-[#22c55e] font-semibold">Enhanced E2EE</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="mt-4 w-full py-2 rounded-lg bg-[#0e72ed] hover:bg-[#0c63ce] font-semibold text-white transition flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Link Copied!" : "Copy Invite Link"}
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          <span className="text-xs font-semibold text-gray-200 hidden sm:block truncate max-w-xs">
            {meeting?.title || "Live Meeting"}
          </span>
        </div>

        {/* View mode & Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "gallery" ? "speaker" : "gallery")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium text-gray-200 transition"
          >
            <Grid size={14} />
            <span className="hidden sm:inline">View: {viewMode === "gallery" ? "Gallery" : "Speaker"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-1.5 rounded-md text-gray-300 hover:bg-white/10 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* MAIN MEETING VIDEO STAGE */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-[#0f0f12] p-3 sm:p-4">
        
        {/* Real Participant Video Grid */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className={`w-full h-full mx-auto grid gap-3 ${gridLayoutClass(participants.length)}`}>
            {participants.map((p) => {
              const isLocal = namesMatch(p.display_name, displayName);

              return (
                <div
                  key={p.id}
                  className="relative rounded-2xl overflow-hidden bg-[#1c1c21] border border-white/5 shadow-lg flex items-center justify-center group"
                >
                  {/* Local Video Stream or Initials Avatar */}
                  {isLocal && videoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    // Initial Avatar Circle
                    <div className="w-full h-full flex items-center justify-center bg-[#18181c]">
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${getAvatarColor(
                          p.display_name
                        )} text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-xl ring-4 ring-white/10`}
                      >
                        {getInitials(p.display_name)}
                      </div>
                    </div>
                  )}

                  {/* Participant Name Tag in bottom-left corner */}
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white flex items-center gap-1.5 border border-white/10">
                    <span>
                      {p.display_name} {isLocal ? "(You)" : ""}
                    </span>
                    {p.role === "host" && (
                      <span className="text-[9px] bg-[#0e72ed] px-1.5 py-0.5 rounded font-bold">Host</span>
                    )}
                  </div>

                  {/* Mic Status Icon in top-right corner */}
                  <div className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/50 backdrop-blur-md">
                    {(isLocal ? muted : p.is_muted) ? (
                      <MicOff size={14} className="text-rose-500" />
                    ) : (
                      <Mic size={14} className="text-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination dots if multiple participants */}
          {participants.length > 0 && (
            <div className="flex items-center gap-2 mt-3 select-none">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          )}
        </div>

        {/* SIDE DRAWER: Participants or Chat */}
        {activeDrawer && (
          <aside className="w-80 bg-[#1c1c20] border-l border-white/10 flex flex-col z-40 animate-in slide-in-from-right duration-200 rounded-l-2xl shadow-2xl my-1 mr-1">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white capitalize">
                {activeDrawer} ({activeDrawer === "participants" ? participants.length : chatMessages.length})
              </h3>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            {activeDrawer === "participants" ? (
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {participants.map((p) => {
                    const isLocal = namesMatch(p.display_name, displayName);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarColor(
                              p.display_name
                            )} text-white text-xs font-bold flex items-center justify-center`}
                          >
                            {getInitials(p.display_name)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-200">
                              {p.display_name} {isLocal ? "(You)" : ""}
                            </div>
                            {p.role === "host" && (
                              <div className="text-[10px] text-[#0e72ed] font-medium">Host</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          {(isLocal ? muted : p.is_muted) ? (
                            <MicOff size={14} className="text-rose-500" />
                          ) : (
                            <Mic size={14} />
                          )}
                          {isLocal && videoEnabled ? (
                            <Video size={14} />
                          ) : (
                            <VideoOff size={14} className="text-rose-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Guest Button for testing */}
                <div className="p-3 border-t border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={addGuestParticipant}
                    className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} /> Add Test Participant
                  </button>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="w-full py-2 px-3 rounded-xl bg-[#0e72ed] hover:bg-[#0c63ce] text-xs font-semibold text-white transition flex items-center justify-center gap-2"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Link Copied!" : "Copy Invite Link"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-400">{msg.sender}</span>
                        <span className="text-[9px] text-gray-500">{msg.time}</span>
                      </div>
                      <div
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          msg.isSelf ? "bg-[#0e72ed] text-white" : "bg-white/10 text-gray-200"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0e72ed]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#0e72ed] hover:bg-[#0c63ce] text-white transition"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}

      </div>

      {/* BOTTOM CONTROL TOOLBAR */}
      <footer className="h-20 bg-[#1c1c20] border-t border-white/10 px-4 flex items-center justify-center shrink-0 relative z-30">
        <div className="flex items-center gap-1 sm:gap-3">
          
          {/* MUTE / UNMUTE BUTTON */}
          <div className="relative flex items-center bg-[#28282e] rounded-xl p-0.5 border border-white/5">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                muted ? "text-rose-500" : "text-gray-200 hover:text-white"
              }`}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="text-[10px] mt-0.5">{muted ? "Unmute" : "Mute"}</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioSettingsOpen(!audioSettingsOpen)}
              className="px-1 text-gray-400 hover:text-white"
            >
              <ChevronUp size={14} />
            </button>

            {/* Audio settings popup */}
            {audioSettingsOpen && (
              <div className="absolute bottom-full mb-3 left-0 w-56 bg-[#242429] rounded-xl shadow-2xl border border-white/10 p-2 text-xs z-50">
                <div className="px-2 py-1 font-bold text-gray-400 uppercase text-[10px]">Select Microphone</div>
                <div className="px-2 py-1 text-white hover:bg-white/10 rounded-md cursor-pointer flex items-center justify-between">
                  <span>Default - Built-in Mic</span>
                  <Check size={12} className="text-[#0e72ed]" />
                </div>
              </div>
            )}
          </div>

          {/* START / STOP VIDEO BUTTON */}
          <div className="relative flex items-center bg-[#28282e] rounded-xl p-0.5 border border-white/5">
            <button
              type="button"
              onClick={toggleVideo}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !videoEnabled ? "text-rose-500" : "text-gray-200 hover:text-white"
              }`}
            >
              {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              <span className="text-[10px] mt-0.5">{videoEnabled ? "Stop Video" : "Start Video"}</span>
            </button>
            <button
              type="button"
              onClick={() => setVideoSettingsOpen(!videoSettingsOpen)}
              className="px-1 text-gray-400 hover:text-white"
            >
              <ChevronUp size={14} />
            </button>

            {/* Camera settings popup */}
            {videoSettingsOpen && (
              <div className="absolute bottom-full mb-3 left-0 w-56 bg-[#242429] rounded-xl shadow-2xl border border-white/10 p-2 text-xs z-50">
                <div className="px-2 py-1 font-bold text-gray-400 uppercase text-[10px]">Select Camera</div>
                <div className="px-2 py-1 text-white hover:bg-white/10 rounded-md cursor-pointer flex items-center justify-between">
                  <span>Integrated Webcam</span>
                  <Check size={12} className="text-[#0e72ed]" />
                </div>
              </div>
            )}
          </div>

          {/* SHARE SCREEN BUTTON */}
          <button
            type="button"
            onClick={() => setScreenSharing(!screenSharing)}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold transition ${
              screenSharing ? "bg-[#22c55e] text-white" : "bg-[#28282e] text-emerald-400 hover:bg-[#32323a]"
            }`}
          >
            <ScreenShare size={20} />
            <span className="text-[10px] mt-0.5">Share Screen</span>
          </button>

          {/* REACTIONS BUTTON */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setReactionsOpen(!reactionsOpen)}
              className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-[#28282e] hover:bg-[#32323a] text-gray-200 hover:text-white text-xs font-semibold transition"
            >
              <Smile size={20} />
              <span className="text-[10px] mt-0.5">Reactions</span>
            </button>

            {/* Reaction Emoji Bar */}
            {reactionsOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#242429] rounded-full shadow-2xl border border-white/10 px-3 py-2 flex items-center gap-2 text-xl z-50 animate-in zoom-in-95 duration-100">
                {["👏", "👍", "❤️", "😂", "😮", "🎉"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="hover:scale-125 transition transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CHAT BUTTON */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeDrawer === "chat" ? "bg-[#0e72ed] text-white" : "bg-[#28282e] hover:bg-[#32323a] text-gray-200"
            }`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px] mt-0.5">Chat</span>
          </button>

          {/* PARTICIPANTS BUTTON */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeDrawer === "participants" ? "bg-[#0e72ed] text-white" : "bg-[#28282e] hover:bg-[#32323a] text-gray-200"
            }`}
          >
            <Users size={20} />
            <span className="text-[10px] mt-0.5">Participants ({participants.length})</span>
          </button>

          {/* END / LEAVE MEETING BUTTON */}
          <div className="relative ml-2 sm:ml-4">
            <button
              type="button"
              onClick={handleLeaveMeeting}
              className="px-5 py-2.5 rounded-xl bg-[#e04838] hover:bg-[#c83b2c] text-white text-xs font-bold transition shadow-lg shadow-[#e04838]/25 flex items-center gap-2"
            >
              <PhoneOff size={16} />
              <span>Leave</span>
            </button>
          </div>

        </div>
      </footer>

    </main>
  );
}
