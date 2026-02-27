/**
 * members/signin/page.tsx — Dual authentication interface
 * 
 * Provides both Google OAuth login and invite code redemption.
 * Handles authentication errors and redirects to member dashboard on success.
 */

"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function SignInInner() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(
    urlError === "NotRegistered" ? "Your email isn't registered. Ask camp leadership for an invite code." : ""
  );

  const handleInviteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      email,
      code,
      redirect: true,
      callbackUrl: "/members",
    });
    if (result?.error) {
      setError("Invalid invite code or email.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-32 pb-20">
      <div className="bg-[#161849]/80 rounded-xl p-8 border border-white/5 card-glow">
        <h1 className="text-2xl font-bold mb-2 text-center">Members Area</h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          Sign in to access the camp dashboard
        </p>

        {/* Google OAuth */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/members" })}
          className="w-full bg-white text-gray-800 font-medium py-3 px-4 rounded-lg mb-4 flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-xs uppercase tracking-wider">or use invite code</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Invite Code */}
        <form onSubmit={handleInviteLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              placeholder="XXXX-XXXX"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="text-slate-500 text-xs text-center mt-6">
          Need an invite code? Talk to camp leadership.
        </p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
