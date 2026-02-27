/**
 * members/page.tsx — Main member dashboard
 * 
 * Protected member portal landing page with announcements, ticket stats,
 * and navigation to member-only features. Redirects unauthenticated users to sign-in.
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MembersDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [ticketStats, setTicketStats] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/members/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && (session.user as any)?.isAdmin) {
      fetch("/api/admin/tickets")
        .then((r) => r.json())
        .then((d) => {
          const tickets = d.tickets || [];
          setTicketStats({
            total: tickets.length,
            available: tickets.filter((t: any) => t.status === "available").length,
            requested: tickets.filter((t: any) => t.status === "requested").length,
            assigned: tickets.filter((t: any) => t.status === "assigned").length,
          });
        });
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;
  const isAdmin = user?.isAdmin;
  const userId = user?.userId;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Welcome back, {session.user?.name || session.user?.email}
            {isAdmin && <span className="ml-2 bg-indigo-600/30 text-indigo-300 text-xs px-2 py-0.5 rounded-full">ADMIN</span>}
          </p>
        </div>
        <Link
          href="/api/auth/signout"
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign Out
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Dues Status", value: "Pending", color: "text-yellow-400" },
          { label: "Meals Pledged", value: "0", color: "text-slate-300" },
          { label: "Shifts Signed Up", value: "0", color: "text-slate-300" },
          { label: "Days to Burn", value: getDaysToBurn(), color: "text-indigo-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
            <p className="text-slate-500 text-xs uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Admin ticket overview */}
      {isAdmin && ticketStats && ticketStats.total > 0 && (
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎫</span>
            <span className="font-medium">Tickets:</span>
            <span className="text-green-400 text-sm">{ticketStats.available} available</span>
            {ticketStats.requested > 0 && (
              <span className="text-yellow-400 text-sm font-bold animate-pulse">⚠ {ticketStats.requested} pending requests</span>
            )}
            <span className="text-indigo-400 text-sm">{ticketStats.assigned} assigned</span>
          </div>
          <Link href="/members/admin/tickets" className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</Link>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Member tools */}
        <DashCard
          href="/members/profile"
          icon="👤"
          title="My Profile"
          desc="Contact info, vehicle, camping setup, dietary needs"
        />
        <DashCard
          href="/members/meals"
          icon="🍳"
          title="Meal Board"
          desc="Sign up to bring vacuum-packed meals for the communal freezer"
        />
        <DashCard
          href="/members/shifts"
          icon="📋"
          title="Shift Signup"
          desc="Kitchen, MOOP, setup, teardown — sign up for shifts"
        />
        <DashCard
          href="/members/tickets"
          icon="🎫"
          title="Tickets"
          desc="View your tickets, request steward sale, SAPs, or transfers"
        />
        <DashCard
          href="/members/assets"
          icon="📦"
          title="Asset Tracker"
          desc="Camp gear inventory — claim custodianship of equipment"
        />
        <DashCard
          href="/camp-planner.html?view=member"
          icon="🗺️"
          title="Camp Map"
          desc="Interactive layout — see where everything goes on the playa"
        />
        {/* Admin tools */}
        {isAdmin && (
          <>
            <DashCard
              href="/members/admin/tickets"
              icon="🎫"
              title="Ticket Management"
              desc="Allocate steward sale, SAPs, and transfer tickets"
              admin
            />
            <DashCard
              href="/members/admin/recruits"
              icon="🎯"
              title="Recruit Pipeline"
              desc="Track prospective members through the recruitment funnel"
              admin
            />
            <DashCard
              href="/members/admin/roster"
              icon="👥"
              title="Roster & Social Credit"
              desc="Full member list with participation scores"
              admin
            />
            <DashCard
              href="/members/admin/dues"
              icon="💰"
              title="Dues Tracking"
              desc="Track camp fee payments and send reminders"
              admin
            />
            <DashCard
              href="/members/admin/announcements"
              icon="📢"
              title="Manage Announcements"
              desc="Post and manage camp announcements"
              admin
            />
            <DashCard
              href="/members/admin/invites"
              icon="🔑"
              title="Invite Codes"
              desc="Generate and manage invite codes for new members"
              admin
            />
            <DashCard
              href="/members/admin/campaigns"
              icon="🎯"
              title="Campaigns"
              desc="Track recruit ads, case file refs, and funnel metrics"
              admin
            />
            <DashCard
              href="/members/admin/analytics"
              icon="📊"
              title="Member Analytics"
              desc="Login activity, engagement levels, who needs a nudge"
              admin
            />
            <DashCard
              href="/camp-planner.html"
              icon="🗺️"
              title="Camp Planner"
              desc="Edit camp layout, save to server, lock official map, push to assets"
              admin
            />
          </>
        )}
      </div>

      {/* Announcements */}
      <AnnouncementsFeed userId={userId} isAdmin={isAdmin} />
    </div>
  );
}

function DashCard({
  href,
  icon,
  title,
  desc,
  admin,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  admin?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <div
        className={`bg-[#161849]/60 rounded-xl p-5 border transition-all group-hover:card-glow ${
          admin ? "border-indigo-500/20 group-hover:border-indigo-500/40" : "border-white/5 group-hover:border-indigo-500/30"
        }`}
      >
        <div className="flex items-start gap-4">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold group-hover:text-indigo-400 transition-colors">
                {title}
              </h3>
              {admin && (
                <span className="bg-indigo-600/30 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">{desc}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

const ANNOUNCEMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  indigo: { bg: "bg-indigo-600/15", border: "border-indigo-500/30", text: "text-indigo-300" },
  amber: { bg: "bg-amber-600/15", border: "border-amber-500/30", text: "text-amber-300" },
  green: { bg: "bg-green-600/15", border: "border-green-500/30", text: "text-green-300" },
  red: { bg: "bg-red-600/15", border: "border-red-500/30", text: "text-red-300" },
  purple: { bg: "bg-purple-600/15", border: "border-purple-500/30", text: "text-purple-300" },
  pink: { bg: "bg-pink-600/15", border: "border-pink-500/30", text: "text-pink-300" },
  cyan: { bg: "bg-cyan-600/15", border: "border-cyan-500/30", text: "text-cyan-300" },
};

function AnnouncementsFeed({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/announcements").then(r => r.json()).then(d => setAnnouncements(d.announcements || []));
  }, []);

  if (announcements.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Announcements</h2>
        <Link href="/members/admin/announcements" className="text-xs text-indigo-400 hover:text-indigo-300">
          View all →
        </Link>
      </div>
      <div className="space-y-2">
        {announcements.slice(0, 5).map((a: any) => {
          const cs = ANNOUNCEMENT_COLORS[a.color] || ANNOUNCEMENT_COLORS.indigo;
          const authorName = a.author?.member?.playaName || a.author?.name || "Unknown";
          return (
            <div key={a.id} className={`rounded-lg p-3 border ${cs.bg} ${cs.border}`}>
              <p className={`text-sm ${cs.text}`}>
                {a.emoji && <span className="mr-2">{a.emoji}</span>}
                {a.message}
              </p>
              <p className="text-slate-600 text-[10px] mt-1">{authorName}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getDaysToBurn() {
  const gate = new Date("2026-08-30");
  const now = new Date();
  const diff = Math.ceil((gate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? String(diff) : "🔥";
}
