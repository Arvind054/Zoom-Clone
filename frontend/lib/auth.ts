"use client";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  status: "available" | "busy" | "away";
};

const USER_STORAGE_KEY = "zoom_authenticated_user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as User;
    }
  } catch {
    // fallback
  }
  // Default demo user if none saved
  return {
    id: "user-101",
    name: "Arvind Choudhary",
    email: "arvind@example.com",
    initials: "AC",
    status: "available",
  };
}

export function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.setItem("zoom-display-name", user.name);
}

export function removeUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
  window.sessionStorage.removeItem("zoom-display-name");
}
