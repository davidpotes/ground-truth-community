"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Shifts() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === "unauthenticated") router.push("/members/signin"); }, [status, router]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">Shift Signup</h1>
      </div>
      <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
        <span className="text-4xl block mb-4">🚧</span>
        <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
        <p className="text-slate-400">Shift signup will open closer to the event. Check back in a few weeks.</p>
      </div>
    </div>
  );
}
