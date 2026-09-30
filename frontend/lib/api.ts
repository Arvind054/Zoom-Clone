export type MeetingStatus = "scheduled" | "live" | "ended";
export type ParticipantRole = "host" | "participant";

export type UserResponse = {
  id: number;
  display_name: string;
  email: string;
  token: string;
};

export type Participant = {
  id: number;
  user_id: number | null;
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
  host_id?: number;
  host_email?: string;
};

export type ScheduleMeetingInput = MeetingInput & {
  title: string;
  scheduled_start: string;
};

export type JoinMeetingInput = {
  display_name: string;
  user_id?: number;
};

export type ParticipantList = {
  participants: Participant[];
};

import { getAuthToken } from "./auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8005";

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, detail?: string) {
    super(detail || `API returned ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detailMessage = "";
    try {
      const errData = await response.json();
      detailMessage = errData.detail || errData.message || "";
    } catch {
      // json parse failed
    }
    throw new ApiError(response.status, detailMessage);
  }

  return (await response.json()) as T;
}

/* Authentication APIs */
export function signupApi(data: { name: string; email: string; password: string }): Promise<UserResponse> {
  return request<UserResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginApi(data: { email: string; password: string }): Promise<UserResponse> {
  return request<UserResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMeApi(userId: number): Promise<UserResponse> {
  return request<UserResponse>(`/auth/me?user_id=${userId}`);
}

/* Meetings APIs */
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