export type MeetingStatus = "scheduled" | "live" | "ended";
export type ParticipantRole = "host" | "participant";

export type Participant = {
  id: number;
  display_name: string;
  role: ParticipantRole;
  is_muted: boolean;
  joined_at: string;
  left_at: string | null;
};

export type Meeting = {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  host_id: number;
  scheduled_start: string | null;
  duration_min: number;
  status: MeetingStatus;
  created_at: string;
  participants: Participant[];
};

export type MeetingInput = {
  title?: string;
  description?: string | null;
  duration_min?: number;
};

export type ScheduleMeetingInput = MeetingInput & {
  title: string;
  scheduled_start: string;
};

export type JoinMeetingInput = {
  display_name: string;
};

export type ParticipantList = {
  participants: Participant[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`API returned ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return (await response.json()) as T;
}

export function createInstantMeeting(input: MeetingInput = {}): Promise<Meeting> {
  return request<Meeting>("/meetings/instant", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function scheduleMeeting(input: ScheduleMeetingInput): Promise<Meeting> {
  return request<Meeting>("/meetings/schedule", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getUpcomingMeetings(): Promise<Meeting[]> {
  return request<Meeting[]>("/meetings/upcoming");
}

export function getRecentMeetings(): Promise<Meeting[]> {
  return request<Meeting[]>("/meetings/recent");
}

export function getMeeting(code: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${encodeURIComponent(code)}`);
}

export function joinMeeting(code: string, input: JoinMeetingInput): Promise<Participant> {
  return request<Participant>(`/meetings/${encodeURIComponent(code)}/join`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function leaveMeeting(code: string, displayName: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${encodeURIComponent(code)}/leave?display_name=${encodeURIComponent(displayName)}`, {
    method: "POST",
  });
}

export function getMeetingParticipants(code: string): Promise<ParticipantList> {
  return request<ParticipantList>(`/meetings/${encodeURIComponent(code)}/participants`);
}