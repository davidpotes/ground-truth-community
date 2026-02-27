"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface MemberDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    isAdmin: boolean;
    lastLoginAt: string | null;
    loginCount: number;
    member: {
      playaName: string | null;
      pronouns: string | null;
      homeBase: string | null;
      phone: string | null;
      emergencyContact: string | null;
      emergencyPhone: string | null;
      vehicle: string | null;
      arrivalDate: string | null;
      departureDate: string | null;
      campingSetup: string | null;
      campRole: string | null;
      dietaryNotes: string | null;
      hasTicket: boolean;
      ticketSource: string | null;
      hasVehiclePass: boolean;
      vehiclePassSource: string | null;
      avatar: string | null;
      createdAt: string;
    } | null;
  };
}

const FIELD_LABELS: Record<string, string> = {
  playaName: "Playa Name",
  pronouns: "Pronouns",
  homeBase: "Home Base",
  phone: "Phone",
  emergencyContact: "Emergency Contact",
  emergencyPhone: "Emergency Phone",
  vehicle: "Transport",
  arrivalDate: "Arrival",
  departureDate: "Departure",
  campingSetup: "Camping Setup",
  campRole: "Camp Role",
  dietaryNotes: "Dietary / Medical",
};

const TICKET_LABELS: Record<string, string> = {
  "": "Needs ticket from camp",
  own: "Has own ticket",
  gifted: "Gifted",
  will_call: "Will call",
  other: "Other",
};

const VP_LABELS: Record<string, string> = {
  "": "Needs VP from camp",
  own: "Has own VP",
  gifted: "Gifted",
  not_needed: "Doesn't need one",
  other: "Other",
};

export default function MemberProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/admin/members/${params.id}`)
        .then((r) => r.json())
        .then((d) => { setDetail(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [params.id]);

  if (status === "loading" || loading) return null;
  if (!detail?.user) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <Link href="/members/admin/roster" className="text-slate-500 hover:text-slate-300">← Roster</Link>
        <p className="mt-8 text-slate-500">Member not found.</p>
      </div>
    );
  }

  const { user } = detail;
  const m = user.member;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members/admin/roster" className="text-slate-500 hover:text-slate-300">← Roster</Link>
        <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
        {user.isAdmin && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-400 font-medium">ADMIN</span>
        )}
      </div>

      {/* Header card */}
      <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#0a0b1e] border-2 border-white/10 flex items-center justify-center flex-shrink-0">
            {m?.avatar ? (
              <img src={m.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">👤</span>
            )}
          </div>
          <div>
            <p className="text-white font-medium text-lg">{m?.playaName || user.name || "—"}</p>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <div className="flex gap-4 mt-1 text-xs text-slate-600">
              <span>Logins: {user.loginCount}</span>
              {user.lastLoginAt && <span>Last: {new Date(user.lastLoginAt).toLocaleDateString()}</span>}
              {m?.createdAt && <span>Joined: {new Date(m.createdAt).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      </div>

      {!m ? (
        <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
          <p className="text-slate-500">No profile data yet — this member hasn&apos;t filled out their profile.</p>
        </div>
      ) : (
        <>
          {/* Profile fields */}
          <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Profile</h2>
            <div className="space-y-2">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = (m as any)[key];
                return (
                  <div key={key} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className={`text-sm ${val ? "text-white" : "text-slate-700"}`}>{val || "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket & VP */}
          <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">🎟️ Tickets & Vehicle Pass</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-sm text-slate-500">Burn Ticket</span>
                <span className={`text-sm font-medium ${m.hasTicket ? "text-green-400" : "text-amber-400"}`}>
                  {TICKET_LABELS[m.ticketSource || ""] || m.ticketSource || "Needs ticket from camp"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-slate-500">Vehicle Pass</span>
                <span className={`text-sm font-medium ${m.hasVehiclePass ? "text-green-400" : m.vehiclePassSource === "not_needed" ? "text-slate-600" : "text-amber-400"}`}>
                  {VP_LABELS[m.vehiclePassSource || ""] || m.vehiclePassSource || "Needs VP from camp"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
