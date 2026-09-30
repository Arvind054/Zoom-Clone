"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, CheckCircle2, ArrowRight, ShieldCheck, Video, Users } from "lucide-react";
import { saveUser } from "../../lib/auth";
import { signupApi, ApiError } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    if (!firstName || !email || !password) {
      setError("Please fill out all required fields.");
      return;
    }
    setError(null);
    setLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const res = await signupApi({
        name: fullName,
        email: email,
        password: password,
      });

      const initials = (firstName[0] + (lastName[0] || "")).toUpperCase();

      saveUser({
        id: String(res.id),
        name: res.display_name,
        email: res.email,
        initials: initials,
        status: "available",
        token: res.token,
      });

      setLoading(false);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.detail) {
        setError(err.detail);
      } else setError("Unable to reach the authentication service. Please try again.");
      setLoading(false);
    }
  }

  function handleSocialSignUp(provider: string) {
    setError(`${provider} sign-up is not configured yet. Use email and password.`);
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
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="font-bold text-[#0e72ed] hover:text-[#0c63ce] hover:underline transition"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-[880px] bg-white rounded-2xl border border-[#e2e8f0] shadow-xl shadow-[#0f172a]/5 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Feature Column */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#0e72ed] to-[#0b5cbe] p-8 text-white flex flex-col justify-between hidden md:flex">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md mb-6 border border-white/20">
                <ShieldCheck size={14} /> Free Forever Account
              </div>
              <h2 className="text-2xl font-black leading-tight tracking-tight">
                One platform to connect, create, and collaborate.
              </h2>
              <p className="text-xs text-blue-100 mt-3 leading-relaxed">
                Join millions of teams worldwide who rely on Zoom for HD video conferencing and real-time team collaboration.
              </p>
            </div>

            <div className="space-y-4 my-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Video size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">HD Video & Crystal Audio</div>
                  <div className="text-[11px] text-blue-100">Unlimited 1-on-1 video calls with noise cancellation.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Up to 100 Participants</div>
                  <div className="text-[11px] text-blue-100">Host group meetings with interactive screen sharing.</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/15 text-[11px] text-blue-200">
              No credit card required. Fast & simple setup.
            </div>
          </div>

          {/* Right Form Column */}
          <div className="md:col-span-7 p-6 sm:p-10">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
                Sign Up Free
              </h1>
              <p className="text-xs sm:text-sm text-[#64748b] mt-1.5">
                Create your Zoom account to get started in seconds
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Arvind"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Choudhary"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0e72ed] focus:bg-white focus:ring-2 focus:ring-[#0e72ed]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                    <CheckCircle2 size={12} className={password.length >= 8 ? "text-emerald-500" : "text-[#cbd5e1]"} />
                    <span>At least 8 characters</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#0e72ed] hover:bg-[#0c63ce] active:scale-[0.99] font-bold text-sm text-white shadow-lg shadow-[#0e72ed]/25 transition flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <>
                    Create Free Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[#64748b]">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#0e72ed] hover:underline">
                Log in
              </Link>
            </p>

            {/* Or Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Or sign up with
              </span>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={true}
                type="button"
                onClick={() => handleSocialSignUp("Google")}
                className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2 transition opacity-50 cursor-not-allowed"
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
                onClick={() => handleSocialSignUp("Apple")}
                className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] flex items-center justify-center gap-2 transition opacity-50 cursor-not-allowed"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.63c.67-.81 1.13-1.94.99-3.07-1 .04-2.22.67-2.92 1.49-.62.72-1.16 1.88-.99 3 1.12.09 2.25-.6 2.92-1.42z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Zoom Footer */}
      <footer className="py-6 px-6 text-center text-xs text-[#94a3b8] border-t border-[#e2e8f0] bg-white">
        <p>
          By signing up, I agree to the Zoom{" "}
          <a href="#" className="underline hover:text-[#0f172a]">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-[#0f172a]">
            Privacy Statement
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
