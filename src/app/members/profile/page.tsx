/**
 * members/profile/page.tsx — Member profile editor
 * 
 * Protected page for members to update their personal information,
 * camp logistics, emergency contacts, and ticket status.
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const fields = [
  { key: "playaName", label: "Playa Name", type: "text" },
  { key: "pronouns", label: "Pronouns", type: "text" },
  { key: "homeBase", label: "Home Base", type: "text" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "emergencyContact", label: "Emergency Contact", type: "text" },
  { key: "emergencyPhone", label: "Emergency Phone", type: "tel" },
  { key: "vehicle", label: "Method of transport (if driving, include vehicle type)", type: "text" },
  { key: "arrivalDate", label: "Arrival Date", type: "date" },
  { key: "departureDate", label: "Departure Date", type: "date" },
  { key: "campingSetup", label: "Camping Setup (tent type, etc)", type: "text" },
  { key: "campRole", label: "Camp Role", type: "text" },
  { key: "dietaryNotes", label: "Dietary / Medical Notes", type: "textarea" },
];

const TICKET_SOURCES = [
  { value: "", label: "I need a ticket from camp" },
  { value: "own", label: "I have my own ticket" },
  { value: "gifted", label: "Someone is gifting me a ticket" },
  { value: "will_call", label: "I have will-call" },
  { value: "other", label: "Other (explain in notes)" },
];

const VP_SOURCES = [
  { value: "", label: "I need a vehicle pass from camp" },
  { value: "own", label: "I have my own vehicle pass" },
  { value: "gifted", label: "Someone is gifting me one" },
  { value: "not_needed", label: "I don't need a vehicle pass" },
  { value: "other", label: "Other" },
];

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [ticketInfo, setTicketInfo] = useState({ hasTicket: false, ticketSource: "", hasVehiclePass: false, vehiclePassSource: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/members/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.member) {
          const m: Record<string, string> = {};
          fields.forEach((f) => {
            m[f.key] = data.member[f.key] || "";
          });
          setForm(m);
          setAvatar(data.member.avatar || null);
          setTicketInfo({
            hasTicket: data.member.hasTicket || false,
            ticketSource: data.member.ticketSource || "",
            hasVehiclePass: data.member.hasVehiclePass || false,
            vehiclePassSource: data.member.vehiclePassSource || "",
          });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/members/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...ticketInfo }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (status === "loading") return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <div className="bg-[#161849]/60 rounded-xl p-6 border border-white/5 space-y-4">
        <div className="bg-[#0a0b1e]/50 rounded-lg p-4 mb-4 flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#161849] border-2 border-white/10 flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">{uploading ? "..." : "📷"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const fd = new FormData();
                  fd.append("avatar", file);
                  const res = await fetch("/api/members/avatar", { method: "POST", body: fd });
                  if (res.ok) {
                    const data = await res.json();
                    setAvatar(data.avatar + "?t=" + Date.now());
                  }
                  setUploading(false);
                }}
              />
            </label>
          </div>
          <div>
            <p className="text-sm text-slate-400">
              <strong className="text-slate-200">Email:</strong> {session?.user?.email}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              <strong className="text-slate-200">Name:</strong> {session?.user?.name}
            </p>
            <p className="text-[10px] text-slate-600 mt-1">Hover avatar to change photo</p>
          </div>
        </div>

        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-slate-400 mb-1">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
              />
            ) : (
              <input
                type={f.type}
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        ))}

        {/* Ticket & Vehicle Pass */}
        <div className="border-t border-white/5 pt-4 mt-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">🎟️ Ticket & Vehicle Pass</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Burn Ticket</label>
              <select
                value={ticketInfo.ticketSource}
                onChange={(e) => setTicketInfo({ ...ticketInfo, hasTicket: !!e.target.value, ticketSource: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {TICKET_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Vehicle Pass</label>
              <select
                value={ticketInfo.vehiclePassSource}
                onChange={(e) => setTicketInfo({ ...ticketInfo, hasVehiclePass: !!e.target.value && e.target.value !== "not_needed", vehiclePassSource: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {VP_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
