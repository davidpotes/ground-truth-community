"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const TYPES = [
  { key: "steward_sale", label: "Steward Sale", icon: "🎪", color: "bg-purple-600" },
  { key: "sap", label: "SAP (Early Entry)", icon: "⚡", color: "bg-amber-600" },
  { key: "vehicle_pass", label: "Vehicle Pass", icon: "🚗", color: "bg-green-700" },
  { key: "transfer", label: "Transfer", icon: "🔄", color: "bg-blue-600" },
];

const STATUSES = [
  { key: "available", label: "Available", color: "text-green-400" },
  { key: "requested", label: "Requested", color: "text-yellow-400" },
  { key: "assigned", label: "Assigned", color: "text-indigo-400" },
  { key: "shipped", label: "Shipped", color: "text-cyan-400" },
  { key: "completed", label: "Completed", color: "text-slate-500" },
];

const DELIVERY = [
  { key: "pickup", label: "Pickup" },
  { key: "mail", label: "Mail" },
  { key: "will_call", label: "Will Call" },
];

interface MemberTicketInfo {
  id: string;
  playaName: string | null;
  hasTicket: boolean;
  ticketSource: string | null;
  hasVehiclePass: boolean;
  vehiclePassSource: string | null;
  user: { name: string | null; email: string | null };
}

interface Ticket {
  id: string;
  type: string;
  status: string;
  assignedTo: string | null;
  requestedBy: string | null;
  price: number | null;
  delivery: string | null;
  trackingNumber: string | null;
  shippingAddress: string | null;
  notes: string | null;
  updatedAt: string;
}

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  playaName: string | null;
}

export default function TicketAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("steward_sale");
  const [addCount, setAddCount] = useState(1);
  const [addPrice, setAddPrice] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showShipping, setShowShipping] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState({ delivery: "", trackingNumber: "", shippingAddress: "" });
  const [members, setMembers] = useState<MemberTicketInfo[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = () => {
    fetch("/api/admin/tickets").then((r) => r.json()).then((d) => setTickets(d.tickets || []));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
    fetch("/api/admin/ticket-coverage").then((r) => r.json()).then((d) => setMembers(d.members || []));
  }, []);

  const userLabel = (email: string | null) => {
    if (!email) return null;
    const u = users.find((u) => u.email === email);
    return u ? (u.playaName || u.name || u.email) : email;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: addType,
        count: addCount,
        price: addPrice ? parseFloat(addPrice) : null,
        notes: addNotes || null,
      }),
    });
    setAddCount(1);
    setAddPrice("");
    setAddNotes("");
    setShowAdd(false);
    load();
  };

  const updateTicket = async (id: string, data: Partial<Ticket>) => {
    await fetch("/api/admin/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  };

  const deleteTicket = async (id: string) => {
    if (!confirm("Delete this ticket?")) return;
    await fetch(`/api/admin/tickets?id=${id}`, { method: "DELETE" });
    load();
  };

  // Stats by type
  const stats = TYPES.map((t) => {
    const ofType = tickets.filter((tk) => tk.type === t.key);
    return {
      ...t,
      total: ofType.length,
      available: ofType.filter((tk) => tk.status === "available").length,
      requested: ofType.filter((tk) => tk.status === "requested").length,
      assigned: ofType.filter((tk) => tk.status === "assigned").length,
      completed: ofType.filter((tk) => tk.status === "completed").length,
    };
  });

  const filtered = filterType === "all" ? tickets : tickets.filter((t) => t.type === filterType);

  if (status === "loading") return null;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Ticket Management</h1>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Tickets
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.key} className="bg-[#161849]/60 rounded-xl border border-white/5 overflow-hidden">
            <div className={`${s.color} px-4 py-2 flex items-center gap-2`}>
              <span>{s.icon}</span>
              <span className="font-bold text-sm">{s.label}</span>
              <span className="ml-auto text-xs opacity-75">{s.total} total</span>
            </div>
            <div className="p-4 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-green-400 text-lg font-bold">{s.available}</p>
                <p className="text-[10px] text-slate-500">Available</p>
              </div>
              <div>
                <p className="text-yellow-400 text-lg font-bold">{s.requested}</p>
                <p className="text-[10px] text-slate-500">Requested</p>
              </div>
              <div>
                <p className="text-indigo-400 text-lg font-bold">{s.assigned}</p>
                <p className="text-[10px] text-slate-500">Assigned</p>
              </div>
              <div>
                <p className="text-slate-500 text-lg font-bold">{s.completed}</p>
                <p className="text-[10px] text-slate-500">Done</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Member Coverage */}
      {members.length > 0 && (
        <div className="bg-[#161849]/60 rounded-xl border border-white/5 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">🎟️ Member Ticket Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{members.length}</p>
              <p className="text-[10px] text-slate-500">Total Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{members.filter(m => m.hasTicket).length}</p>
              <p className="text-[10px] text-slate-500">Have Ticket</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{members.filter(m => !m.hasTicket).length}</p>
              <p className="text-[10px] text-slate-500">Need Ticket</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{members.filter(m => m.hasVehiclePass).length}</p>
              <p className="text-[10px] text-slate-500">Have VP</p>
            </div>
          </div>
          <div className="space-y-1">
            {members.map((m) => {
              const name = m.playaName || m.user.name || m.user.email || "Unknown";
              return (
                <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-slate-300">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className={m.hasTicket ? "text-green-400" : "text-amber-400"}>
                      🎪 {m.hasTicket ? (m.ticketSource === "own" ? "Own ticket" : m.ticketSource === "gifted" ? "Gifted" : m.ticketSource === "will_call" ? "Will call" : m.ticketSource || "Has ticket") : "Needs ticket"}
                    </span>
                    <span className={m.hasVehiclePass ? "text-green-400" : m.vehiclePassSource === "not_needed" ? "text-slate-600" : "text-amber-400"}>
                      🚗 {m.hasVehiclePass ? (m.vehiclePassSource === "own" ? "Own VP" : m.vehiclePassSource === "gifted" ? "Gifted" : m.vehiclePassSource || "Has VP") : m.vehiclePassSource === "not_needed" ? "N/A" : "Needs VP"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Type</label>
            <select value={addType} onChange={(e) => setAddType(e.target.value)}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Quantity</label>
            <input type="number" min={1} value={addCount} onChange={(e) => setAddCount(Number(e.target.value))}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Price (optional)</label>
            <input type="number" step="0.01" value={addPrice} onChange={(e) => setAddPrice(e.target.value)}
              placeholder="$"
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes</label>
            <input type="text" value={addNotes} onChange={(e) => setAddNotes(e.target.value)}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="col-span-2 md:col-span-4">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition-colors">
              Add {addCount} Ticket{addCount > 1 ? "s" : ""}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterType("all")}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterType === "all" ? "bg-indigo-600" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
          All
        </button>
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setFilterType(t.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterType === t.key ? "bg-indigo-600" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
            <p className="text-slate-500">No tickets yet. Add some above.</p>
          </div>
        ) : (
          filtered.map((tk) => {
            const typeInfo = TYPES.find((t) => t.key === tk.type);
            const statusInfo = STATUSES.find((s) => s.key === tk.status);
            return (
              <div key={tk.id} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">{typeInfo?.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-white/5 rounded px-2 py-0.5 text-slate-500">{typeInfo?.label}</span>
                        <span className={`text-xs font-medium ${statusInfo?.color}`}>{statusInfo?.label}</span>
                        {tk.price && <span className="text-xs text-slate-500">${tk.price}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-slate-500">
                        {tk.assignedTo && <span>Assigned: <strong className="text-slate-300">{userLabel(tk.assignedTo)}</strong></span>}
                        {tk.requestedBy && <span>Requested by: <strong className="text-yellow-400">{userLabel(tk.requestedBy)}</strong></span>}
                        {tk.delivery && <span>Delivery: <strong className="text-slate-300">{DELIVERY.find(d => d.key === tk.delivery)?.label || tk.delivery}</strong></span>}
                        {tk.trackingNumber && <span>Tracking: <strong className="text-cyan-400">{tk.trackingNumber}</strong></span>}
                        {tk.notes && <span className="truncate max-w-xs cursor-help" title={tk.notes}>Notes: {tk.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Quick status actions */}
                    {tk.status === "requested" && (
                      <button onClick={() => updateTicket(tk.id, { status: "assigned", assignedTo: tk.requestedBy })}
                        className="text-[10px] px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400">
                        ✓ Approve
                      </button>
                    )}
                    {tk.status === "assigned" && (
                      <>
                        <button onClick={() => {
                          setShowShipping(showShipping === tk.id ? null : tk.id);
                          setShippingForm({ delivery: tk.delivery || "", trackingNumber: tk.trackingNumber || "", shippingAddress: tk.shippingAddress || "" });
                        }}
                          className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400">
                          📦 Ship
                        </button>
                        <button onClick={() => updateTicket(tk.id, { status: "completed" })}
                          className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400">
                          ✓ Complete
                        </button>
                      </>
                    )}
                    {tk.status === "shipped" && (
                      <button onClick={() => updateTicket(tk.id, { status: "completed" })}
                        className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400">
                        ✓ Complete
                      </button>
                    )}
                    {tk.status !== "available" && (
                      <button onClick={() => updateTicket(tk.id, { status: "available", assignedTo: null, requestedBy: null, delivery: null, trackingNumber: null, shippingAddress: null })}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400">
                        ↩ Reset
                      </button>
                    )}
                    {/* Assign via user picker */}
                    {(tk.status === "available") && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) updateTicket(tk.id, { status: "assigned", assignedTo: e.target.value });
                        }}
                        className="text-[10px] bg-[#0a0b1e] border border-white/10 rounded px-2 py-1 text-slate-400 max-w-[140px]"
                      >
                        <option value="">Assign to...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.email!}>{u.playaName || u.name || u.email}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => deleteTicket(tk.id)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-600" title="Delete">
                      🗑
                    </button>
                  </div>
                </div>
                {/* Shipping form */}
                {showShipping === tk.id && (
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Delivery Method</label>
                      <select value={shippingForm.delivery} onChange={(e) => setShippingForm({ ...shippingForm, delivery: e.target.value })}
                        className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm">
                        <option value="">Select...</option>
                        {DELIVERY.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Tracking Number</label>
                      <input type="text" value={shippingForm.trackingNumber} onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                        className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Shipping Address</label>
                      <input type="text" value={shippingForm.shippingAddress} onChange={(e) => setShippingForm({ ...shippingForm, shippingAddress: e.target.value })}
                        className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" placeholder="If mailing" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={async () => {
                        await updateTicket(tk.id, { status: "shipped", ...shippingForm });
                        setShowShipping(null);
                      }}
                        className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded">Mark Shipped</button>
                      <button onClick={() => setShowShipping(null)}
                        className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
