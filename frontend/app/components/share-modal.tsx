"use client";

import { useState } from "react";
import { Monitor, AppWindow, Globe, X, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ShareModal({ open, onClose }: ShareModalProps) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<"screen" | "window" | "tab">("screen");
  const [meetingKey, setMeetingKey] = useState("");

  if (!open) return null;

  function handleShare() {
    // Generate an instant meeting key or navigate to demo meeting with share mode
    const code = meetingKey.trim() || "share-session-101";
    router.push(`/meeting/${code}?share=true`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/50 px-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0e72ed]/10 text-[#0e72ed] flex items-center justify-center">
              <Monitor size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">Share Screen & Content</h2>
              <p className="text-xs text-[#64748b]">Select what you would like to present</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setSelectedOption("screen")}
            className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-4 transition ${
              selectedOption === "screen"
                ? "border-[#0e72ed] bg-[#e8f2ff]/50 ring-2 ring-[#0e72ed]/20"
                : "border-[#e2e8f0] hover:bg-[#f8fafc]"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-[#0e72ed] text-white flex items-center justify-center shrink-0">
              <Monitor size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#0f172a]">Entire Screen</div>
              <div className="text-xs text-[#64748b]">Share your desktop and all open applications</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOption("window")}
            className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-4 transition ${
              selectedOption === "window"
                ? "border-[#0e72ed] bg-[#e8f2ff]/50 ring-2 ring-[#0e72ed]/20"
                : "border-[#e2e8f0] hover:bg-[#f8fafc]"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-[#38bdf8] text-white flex items-center justify-center shrink-0">
              <AppWindow size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#0f172a]">Application Window</div>
              <div className="text-xs text-[#64748b]">Choose a specific app window to present</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOption("tab")}
            className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-4 transition ${
              selectedOption === "tab"
                ? "border-[#0e72ed] bg-[#e8f2ff]/50 ring-2 ring-[#0e72ed]/20"
                : "border-[#e2e8f0] hover:bg-[#f8fafc]"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-[#10b981] text-white flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#0f172a]">Browser Tab</div>
              <div className="text-xs text-[#64748b]">Share audio and video from a single tab</div>
            </div>
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold text-[#475569] mb-1.5">
            Meeting Sharing Key or ID (optional)
          </label>
          <input
            type="text"
            placeholder="Enter sharing key if joining existing room"
            value={meetingKey}
            onChange={(e) => setMeetingKey(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#0f172a] focus:outline-none focus:border-[#0e72ed] focus:bg-white transition"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-5 py-2.5 rounded-xl bg-[#0e72ed] text-xs font-semibold text-white hover:bg-[#0c63ce] transition flex items-center gap-1.5 shadow-md shadow-[#0e72ed]/20"
          >
            Share Screen <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
