"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  steward_sale: { label: "Steward Sale", icon: "🎪" },
  sap: { label: "SAP (Early Entry)", icon: "⚡" },
  vehicle_pass: { label: "Vehicle Pass", icon: "🚗" },
  transfer: { label: "Transfer", icon: "🔄" },
};

const STATUS_COLORS: Record<string, string> = {
  available: "text-green-400",
  requested: "text-yellow-400",
  assigned: "text-indigo-400",
  completed: "text-slate-500",
};

export default function MyTickets() {
  const { status } = useSession();
  const router = useRouter();
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
  }, [status, router]);

  const load = () => {
    fetch("/api/members/tickets").then((r) => r.json()).then((d) => {
      setMyTickets(d.myTickets || []);
      setAvailable(d.available || []);
    });
  };
  useEffect(() => { load(); }, []);

  const requestTicket = async (type: string) => {
    setRequesting(true);
    const notes = prompt("Any notes for your request? (optional)");
    await fetch("/api/members/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, notes }),
    });
    setRequesting(false);
    load();
  };

  if (status === "loading") return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">My Tickets</h1>
      </div>

      {/* Available tickets to request */}
      <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6">
        <h2 className="font-bold mb-3">Available Tickets</h2>
        {available.length === 0 ? (
          <p className="text-slate-500 text-sm">No tickets currently available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {available.map((a: any) => {
              const info = TYPE_LABELS[a.type] || { label: a.type, icon: "🎫" };
              return (
                <div key={a.type} className="bg-[#0a0b1e]/50 rounded-lg p-4 text-center">
                  <span className="text-2xl">{info.icon}</span>
                  <p className="font-medium mt-1">{info.label}</p>
                  <p className="text-green-400 text-sm">{a._count} available</p>
                  <button
                    onClick={() => requestTicket(a.type)}
                    disabled={requesting}
                    className="mt-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Request
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My tickets */}
      <h2 className="font-bold mb-3">Your Tickets</h2>
      {myTickets.length === 0 ? (
        <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
          <p className="text-slate-500">No tickets yet. Request one above when available.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myTickets.map((tk: any) => {
            const info = TYPE_LABELS[tk.type] || { label: tk.type, icon: "🎫" };
            return (
              <div key={tk.id} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                <span className="text-xl">{info.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{info.label}</p>
                  <p className={`text-xs ${STATUS_COLORS[tk.status]}`}>
                    {tk.status === "requested" && "⏳ Pending approval"}
                    {tk.status === "assigned" && "✓ Assigned to you"}
                    {tk.status === "shipped" && "📦 Shipped"}
                    {tk.status === "completed" && "✓ Completed"}
                  </p>
                  {tk.delivery && (
                    <p className="text-xs text-slate-500 mt-1">
                      Delivery: {tk.delivery === "mail" ? "📬 Mail" : tk.delivery === "will_call" ? "🎪 Will Call" : "🤝 Pickup"}
                      {tk.trackingNumber && <span className="ml-2 text-cyan-400">Tracking: {tk.trackingNumber}</span>}
                    </p>
                  )}
                  {tk.notes && <p className="text-xs text-slate-600 mt-1">{tk.notes}</p>}
                </div>
                {tk.price && <span className="text-sm text-slate-400">${tk.price}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
