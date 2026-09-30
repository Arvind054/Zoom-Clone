"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LoaderCircle, ArrowRight } from "lucide-react";
import { saveUser } from "../../lib/auth";
import { loginApi, ApiError } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await loginApi({ email, password });
      const initials = res.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "Z";

      saveUser({
        id: String(res.id),
        name: res.display_name,
        email: res.email,
        initials: initials,
        status: "available",
      });

      setLoading(false);
      router.push("/");
    } catch (err) {
      // Fallback for demo if backend is offline or returns error
      if (err instanceof ApiError && err.detail) {
        setError(err.detail);
      } else {
        const username = email.split("@")[0] || "User";
        const formattedName = username
          .split(/[._-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

        const initials = formattedName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "Z";

        saveUser({
          id: `user-${Date.now()}`,
          name: formattedName,
          email: email,
          initials: initials,
          status: "available",
        });

        router.push("/");
      }
      setLoading(false);
    }
  }

  function handleSocialLogin(provider: string) {
    setLoading(true);
    setTimeout(() => {
      saveUser({
        id: `user-${provider}-${Date.now()}`,
        name: `${provider} User`,
        email: `user@${provider.toLowerCase()}.com`,
        initials: provider.slice(0, 2).toUpperCase(),
        status: "available",
      });
      setLoading(false);
      router.push("/");
    }, 600);
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-[#0f172a] flex flex-col justify-between font-sans selection:bg-[#0e72ed] selection:text-white">
      {/* Zoom Header */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-[#e2e8f0] bg-white">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#0e72ed] flex items-center justify-center text-white font-bold text-xl shadow-md shadow-[#0e72ed]/25">
            z
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#0f172a]">
            zoom
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#64748b]">
          <span>New to Zoom?</span>
          <Link
            href="/signup"
            className="font-bold text-[#0e72ed] hover:text-[#0c63ce] hover:underline transition"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-[440px] bg-white p-8 sm:p-10 rounded-2xl border border-[#e2e8f0] shadow-xl shadow-[#0f172a]/5">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-[#64748b] mt-2">
              Access your Zoom account to start or join meetings
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Password reset instructions sent to your email!");
                  }}
                  className="text-xs font-semibold text-[#0e72ed] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#475569]">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-[#cbd5e1] text-[#0e72ed] focus:ring-[#0e72ed] cursor-pointer"
                />
                <span>Stay signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0e72ed] hover:bg-[#0c63ce] active:scale-[0.99] font-bold text-sm text-white shadow-lg shadow-[#0e72ed]/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Or Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2e8f0]" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Or sign in with
            </span>
          </div>

          {/* Social / SSO Logins */}
          <div className="space-y-2.5">
            <button
              disabled={true}
              type="button"
              onClick={() => handleSocialLogin("SSO")}
              className="w-full py-2.5 px-4 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2.5 transition opacity-50 cursor-not-allowed"
            >
              <KeyRound size={16} className="text-[#0e72ed]" />
              <span>Sign in with SSO</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={true}
                type="button"
                onClick={() => handleSocialLogin("Google")}
                className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2 transition opacity-50 cursor-not-allowed"
                title="Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                disabled={true}
                type="button"
                onClick={() => handleSocialLogin("Apple")}
                className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2 transition opacity-50 cursor-not-allowed"
                title="Apple"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.63c.67-.81 1.13-1.94.99-3.07-1 .04-2.22.67-2.92 1.49-.62.72-1.16 1.88-.99 3 1.12.09 2.25-.6 2.92-1.42z" />
                </svg>
                <span>Apple</span>
              </button>

              <button
                disabled={true}
                type="button"
                onClick={() => handleSocialLogin("Facebook")}
                className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2 transition opacity-50 cursor-not-allowed"
                title="Facebook"
              >
                <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Zoom Footer */}
      <footer className="py-6 px-6 text-center text-xs text-[#94a3b8] border-t border-[#e2e8f0] bg-white">
        <p>
          By signing in, I agree to the Zoom{" "}
          <a href="#" className="underline hover:text-[#0f172a]">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-[#0f172a]">
            Privacy Statement
          </a>
          .
        </p>
        <p className="mt-1 text-[11px] text-[#cbd5e1]">
          © {new Date().getFullYear()} Zoom Video Communications, Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
