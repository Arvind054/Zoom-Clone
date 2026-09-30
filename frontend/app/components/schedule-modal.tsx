"use client";

import { FormEvent, useState } from "react";
import { Check, Clipboard, LoaderCircle, X } from "lucide-react";

import { scheduleMeeting, type Meeting } from "../../lib/api";

type ScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (meeting: Meeting) => void;
};

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultTime() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.toTimeString().slice(0, 5);
}

export function ScheduleModal({ open, onClose, onCreated }: ScheduleModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getTodayDate);
  const [time, setTime] = useState(getDefaultTime);
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !date || !time) return;

    setError(null);
    setSubmitting(true);
    try {
      const meeting = await scheduleMeeting({
        title: title.trim(),
        description: description.trim() || null,
        duration_min: Number(duration),
        scheduled_start: `${date}T${time}:00`,
      });
      onCreated(meeting);
      setInviteLink(`${window.location.origin}/meeting/${meeting.meeting_code}`);
    } catch {
      setError("Could not schedule this meeting. Check that the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#172235]/45 px-5 py-8 backdrop-blur-[2px]" role="presentation">
      <div aria-labelledby="schedule-meeting-title" aria-modal="true" className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-[0_22px_70px_rgba(16,32,61,0.24)] sm:p-8" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#36a269]">Schedule a meeting</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#172235]" id="schedule-meeting-title">Plan your next conversation</h2><p className="mt-2 text-sm leading-5 text-[#768194]">Choose a time and share the invite when you&apos;re ready.</p></div>
          <button aria-label="Close schedule dialog" className="rounded-lg p-2 text-[#8993a3] transition hover:bg-[#f2f5f9] hover:text-[#172235]" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        {inviteLink ? (
          <div className="mt-8 rounded-xl border border-[#cce9d9] bg-[#f2fbf6] p-5"><div className="flex items-center gap-2 text-sm font-bold text-[#277c50]"><Check size={17} /> Meeting scheduled</div><p className="mt-2 text-xs leading-5 text-[#5c806d]">Your invite link is ready to share.</p><div className="mt-4 flex items-center gap-2 rounded-lg border border-[#d8eee1] bg-white p-2"><input aria-label="Invite link" className="min-w-0 flex-1 bg-transparent px-2 text-xs text-[#354155] outline-none" readOnly value={inviteLink} /><button aria-label={copied ? "Invite link copied" : "Copy invite link"} className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#36a269] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2d8c5a]" onClick={copyInviteLink} title="Copy invite link" type="button">{copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? "Copied" : "Copy"}</button></div><button className="mt-5 text-xs font-bold text-[#277c50]" onClick={onClose} type="button">Done</button></div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Title</span><input autoFocus className="w-full rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition placeholder:text-[#a3adbb] focus:border-[#70c69a] focus:bg-white focus:ring-2 focus:ring-[#e4f5eb]" onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Product roadmap review" required value={title} /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Description <span className="font-normal text-[#a3adbb]">(optional)</span></span><textarea className="min-h-[76px] w-full resize-none rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition placeholder:text-[#a3adbb] focus:border-[#70c69a] focus:bg-white focus:ring-2 focus:ring-[#e4f5eb]" onChange={(event) => setDescription(event.target.value)} placeholder="What will you cover?" value={description} /></label>
            <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]"><label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Date</span><input className="w-full rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition focus:border-[#70c69a] focus:bg-white focus:ring-2 focus:ring-[#e4f5eb]" min={getTodayDate()} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Time</span><input className="w-full rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition focus:border-[#70c69a] focus:bg-white focus:ring-2 focus:ring-[#e4f5eb]" onChange={(event) => setTime(event.target.value)} required type="time" value={time} /></label></div>
            <label className="block"><span className="mb-2 block text-xs font-bold text-[#354155]">Duration</span><select className="w-full rounded-[10px] border border-[#dce2ea] bg-[#fbfcfe] px-3.5 py-3 text-sm text-[#172235] outline-none transition focus:border-[#70c69a] focus:bg-white focus:ring-2 focus:ring-[#e4f5eb]" onChange={(event) => setDuration(event.target.value)} value={duration}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option><option value="120">2 hours</option></select></label>
            {error ? <p aria-live="polite" className="text-xs font-medium text-[#c35449]">{error}</p> : null}
            <button className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#36a269] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2d8c5a] disabled:cursor-not-allowed disabled:bg-[#b7d8c4]" disabled={submitting || !title.trim() || !date || !time} type="submit">{submitting ? <><LoaderCircle className="animate-spin" size={16} /> Scheduling...</> : "Schedule meeting"}</button>
          </form>
        )}
      </div>
    </div>
  );
}