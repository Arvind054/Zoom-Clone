"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ApiError, getMeeting, joinMeeting } from "../../lib/api";
import { getStoredUser } from "../../lib/auth";

const meetingCodePattern = /\b\d{3}-\d{3}-\d{4}\b/;

export function extractMeetingCode(value: string): string | null {
  return value.match(meetingCodePattern)?.[0] ?? null;
}

type JoinModalProps = {
  open: boolean;
  onClose: () => void;
};

export function JoinModal({ open, onClose }: JoinModalProps) {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const code = extractMeetingCode(meetingInput);
  const inputHasValue = meetingInput.trim().length > 0;
  const codeIsInvalid = inputHasValue && code === null;
  const isValid = code !== null && displayName.trim().length > 0;

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code || !displayName.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      const meeting = await getMeeting(code);
      if (meeting.status === "ended") {
        setError("That meeting has ended. Check the ID or invite link and try again.");
        return;
      }
      const user = getStoredUser();
      await joinMeeting(code, {
        display_name: displayName.trim(),
        user_id: user ? Number(user.id) : undefined,
      });
      window.sessionStorage.setItem("zoom-display-name", displayName.trim());
      router.push(`/meeting/${code}`);
    } catch (joinError) {
      if (joinError instanceof ApiError && joinError.status === 404) {
        setError("That meeting does not exist. Check the ID or invite link and try again.");
      } else {
        setError("Could not join this meeting right now. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172235]/45 px-5 backdrop-blur-[2px]" role="presentation">
      <div aria-labelledby="join-meeting-title" aria-modal="true" className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_22px_70px_rgba(16,32,61,0.24)] sm:p-8" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0b5cff]">Join a room</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#172235]" id="join-meeting-title">Enter your meeting details</h2><p className="mt-2 text-sm leading-5 text-[#768194]">Use the meeting ID or paste the full invite link.</p></div>
          <button aria-label="Close join dialog" className="rounded-lg p-2 text-[#8993a3] transition hover:bg-[#f2f5f9] hover:text-[#172235]" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Meeting ID or invite link</span><input autoFocus className={`w-full rounded-[10px] border bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition placeholder:text-[#a3adbb] focus:bg-white focus:ring-2 ${codeIsInvalid ? "border-[#df7569] focus:border-[#df7569] focus:ring-[#fbe2df]" : "border-[#dce2ea] focus:border-[#8bb0f7] focus:ring-[#e7efff]"}`} onChange={(event) => { setMeetingInput(event.target.value); setError(null); }} placeholder="123-456-7890 or https://..." value={meetingInput} /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Your display name</span><input className="w-full rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition placeholder:text-[#a3adbb] focus:border-[#8bb0f7] focus:bg-white focus:ring-2 focus:ring-[#e7efff]" onChange={(event) => { setDisplayName(event.target.value); setError(null); }} placeholder="How others will see you" value={displayName} /></label>
          {codeIsInvalid ? <p className="text-xs font-medium text-[#c35449]">Enter a valid meeting ID or invite link.</p> : null}
          {error ? <p aria-live="polite" className="text-xs font-medium text-[#c35449]">{error}</p> : null}
          <button className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0b5cff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#084dcc] disabled:cursor-not-allowed disabled:bg-[#b9c9e5]" disabled={!isValid || submitting} type="submit">{submitting ? <><LoaderCircle className="animate-spin" size={16} /> Checking meeting...</> : "Join meeting"}</button>
        </form>
      </div>
    </div>
  );
}