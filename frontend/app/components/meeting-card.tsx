import { CalendarDays, Clock3, MoreHorizontal, Users } from "lucide-react";

import type { Meeting } from "../../lib/api";

type MeetingCardProps = {
  meeting: Meeting;
  recent?: boolean;
};

function formatMeetingTime(value: string | null) {
  if (!value) return "Time to be confirmed";
  const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(hasTimezone ? value : `${value}Z`));
}

export function MeetingCard({ meeting, recent = false }: MeetingCardProps) {
  const participantCount = meeting.participants.length;

  return (
    <article className="group flex min-h-[154px] flex-col justify-between rounded-xl border border-[#e5eaf1] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c7d6ed] hover:shadow-[0_10px_24px_rgba(34,56,92,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${recent ? "bg-[#9aa5b5]" : "bg-[#43c98b]"}`} />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8993a3]">
            {recent ? "Completed" : meeting.status}
          </span>
        </div>
        <button aria-label={`More options for ${meeting.title}`} className="rounded-md p-1 text-[#a3adbb] opacity-0 transition hover:bg-[#f3f6fa] hover:text-[#344159] group-hover:opacity-100" title="More options" type="button">
          <MoreHorizontal size={17} />
        </button>
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="truncate text-[15px] font-bold text-[#273449]">{meeting.title}</h3>
        <p className="mt-1 truncate text-xs text-[#8993a3]">{meeting.description ?? "No description"}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#edf0f4] pt-3 text-[11px] font-medium text-[#768194]">
        <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {formatMeetingTime(meeting.scheduled_start)}</span>
        <span className="flex items-center gap-1.5"><Clock3 size={13} /> {meeting.duration_min} min</span>
        <span className="flex items-center gap-1.5"><Users size={13} /> {participantCount} {participantCount === 1 ? "person" : "people"}</span>
      </div>
    </article>
  );
}