"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  service: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        setHealth((await response.json()) as HealthResponse);
      } catch {
        setError("Could not connect to the backend.");
      }
    };

    void checkHealth();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0B5CFF]">
          Zoom Clone
        </p>
        <h1 className="text-3xl font-semibold text-slate-950">Backend status</h1>
        <p className="mt-3 text-slate-600">
          This page checks whether the FastAPI service is reachable.
        </p>

        <div className="mt-8 rounded-xl bg-slate-50 p-5" aria-live="polite">
          {health ? (
            <div>
              <p className="font-medium text-emerald-700">Backend is healthy</p>
              <p className="mt-2 text-sm text-slate-600">
                {health.service} returned: {health.status}
              </p>
            </div>
          ) : error ? (
            <p className="font-medium text-red-600">{error}</p>
          ) : (
            <p className="text-slate-600">Checking backend...</p>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-500">API: {apiUrl}/health</p>
      </section>
    </main>
  );
}
