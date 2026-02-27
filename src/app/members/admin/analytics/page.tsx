/**
 * members/admin/analytics/page.tsx — Member engagement analytics dashboard
 * 
 * Admin interface for monitoring user activity, login patterns, page views,
 * and system engagement metrics. Provides insights into member participation.
 */

"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface UserAnalytics {
  id: string;
  name: string | null;
  email: string;
  playaName: string | null;
  isAdmin: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  actionsThisWeek: number;
  lastPage: string | null;
  lastActivity: string | null;
}

interface RecentLog {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function engagementLevel(u: UserAnalytics): { label: string; color: string } {
  if (!u.lastLoginAt) return { label: "Never logged in", color: "text-red-400" };
  const daysSince = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 1 && u.actionsThisWeek >= 3) return { label: "Active", color: "text-green-400" };
  if (daysSince < 3) return { label: "Recent", color: "text-emerald-400" };
  if (daysSince < 7) return { label: "Cooling off", color: "text-yellow-400" };
  if (daysSince < 14) return { label: "Needs nudge", color: "text-orange-400" };
  return { label: "Gone cold", color: "text-red-400" };
}

export default function Analytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ analytics: UserAnalytics[]; recentActivity: RecentLog[] } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/admin/analytics").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="max-w-5xl mx-auto px-4 pt-24 pb-20"><p className="text-slate-400">Loading...</p></div>;

  const { analytics, recentActivity } = data;
  const active = analytics.filter(u => u.actionsThisWeek > 0).length;
  const needsNudge = analytics.filter(u => {
    if (!u.lastLoginAt) return true;
    return (Date.now() - new Date(u.lastLoginAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">Member Analytics</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Total Members</p>
          <p className="text-3xl font-bold text-white mt-1">{analytics.length}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Active This Week</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{active}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Needs Nudge</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{needsNudge}</p>
        </div>
      </div>

      {/* Member engagement table */}
      <div className="bg-[#161849]/60 rounded-xl border border-white/5 overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-white/5">
          <h2 className="font-bold">Member Engagement</h2>
        </div>
        <div className="divide-y divide-white/5">
          {analytics.map((u) => {
            const eng = engagementLevel(u);
            return (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{u.name || "—"}</span>
                      {u.playaName && <span className="text-indigo-400 text-sm">({u.playaName})</span>}
                      {u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-400">ADMIN</span>}
                    </div>
                    <p className="text-slate-600 text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm shrink-0">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Last login</p>
                    <p className="text-slate-300">{timeAgo(u.lastLoginAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Logins</p>
                    <p className="text-slate-300">{u.loginCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">This week</p>
                    <p className="text-slate-300">{u.actionsThisWeek}</p>
                  </div>
                  <div className="text-right w-28">
                    <p className={`text-sm font-medium ${eng.color}`}>{eng.label}</p>
                    {u.lastPage && <p className="text-slate-600 text-[10px] truncate">{u.lastPage}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="bg-[#161849]/60 rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h2 className="font-bold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {recentActivity.map((log) => (
            <div key={log.id} className="px-5 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 truncate">{log.user.name || log.user.email}</span>
                <span className="text-slate-600">·</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  log.action === "login" ? "bg-blue-600/20 text-blue-400" :
                  log.action === "page_view" ? "bg-slate-600/20 text-slate-400" :
                  "bg-purple-600/20 text-purple-400"
                }`}>{log.action}</span>
                {log.detail && <span className="text-slate-500 text-xs truncate">{log.detail}</span>}
              </div>
              <span className="text-slate-600 text-xs shrink-0">{timeAgo(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
