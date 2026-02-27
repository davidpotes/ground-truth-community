"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const METHODS = ["venmo", "cash", "zelle", "other"];

interface UserRef { id: string; name: string | null; email: string }
interface Payment {
  id: string; userId: string; amount: number; method: string; note: string | null;
  paidAt: string; recordedBy: string | null; user: UserRef;
}
interface DuesOverride {
  id: string; userId: string; duesItemId: string; amount: number; reason: string | null;
}
interface DuesItem {
  id: string; name: string; amount: number; dueDate: string | null;
  description: string | null; active: boolean; payments: Payment[]; overrides: DuesOverride[];
}

export default function DuesAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<DuesItem[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", amount: "", dueDate: "", description: "" });
  const [paymentForm, setPaymentForm] = useState<{ duesItemId: string; userId: string; amount: string; method: string; note: string } | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ duesItemId: string; userId: string; amount: string; reason: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = () => {
    fetch("/api/admin/dues").then(r => r.json()).then(d => {
      setItems(d.items || []);
      setUsers(d.users || []);
    });
  };
  useEffect(() => { load(); }, []);

  const createItem = async () => {
    setError("");
    if (!itemForm.name || !itemForm.amount) { setError("Name and amount required"); return; }
    const res = await fetch("/api/admin/dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemForm),
    });
    if (res.ok) { setItemForm({ name: "", amount: "", dueDate: "", description: "" }); setShowCreateItem(false); load(); }
    else { const d = await res.json(); setError(d.error || "Failed"); }
  };

  const recordPayment = async () => {
    if (!paymentForm) return;
    setError("");
    if (!paymentForm.userId || !paymentForm.amount) { setError("Member and amount required"); return; }
    const res = await fetch("/api/admin/dues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment", ...paymentForm }),
    });
    if (res.ok) { setPaymentForm(null); load(); }
    else { const d = await res.json(); setError(d.error || "Failed"); }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("Remove this payment record?")) return;
    await fetch(`/api/admin/dues?paymentId=${paymentId}`, { method: "DELETE" });
    load();
  };

  const saveOverride = async () => {
    if (!overrideForm) return;
    setError("");
    if (!overrideForm.userId || !overrideForm.amount) { setError("Member and amount required"); return; }
    const res = await fetch("/api/admin/dues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "override", ...overrideForm }),
    });
    if (res.ok) { setOverrideForm(null); load(); }
    else { const d = await res.json(); setError(d.error || "Failed"); }
  };

  const removeOverride = async (userId: string, duesItemId: string) => {
    await fetch("/api/admin/dues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeOverride", userId, duesItemId }),
    });
    load();
  };

  const toggleItem = async (item: DuesItem) => {
    await fetch("/api/admin/dues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    load();
  };

  // Calculate per-member totals for an item
  const memberStatus = (item: DuesItem) => {
    const byUser: Record<string, { user: UserRef; paid: number; payments: Payment[] }> = {};
    item.payments.forEach(p => {
      if (!byUser[p.userId]) byUser[p.userId] = { user: p.user, paid: 0, payments: [] };
      byUser[p.userId].paid += p.amount;
      byUser[p.userId].payments.push(p);
    });
    const overrideMap: Record<string, DuesOverride> = {};
    item.overrides.forEach(o => { overrideMap[o.userId] = o; });

    return users.map(u => {
      const owed = overrideMap[u.id]?.amount ?? item.amount;
      return {
        user: u,
        paid: byUser[u.id]?.paid || 0,
        payments: byUser[u.id]?.payments || [],
        owed,
        balance: owed - (byUser[u.id]?.paid || 0),
        override: overrideMap[u.id] || null,
      };
    });
  };

  const totalOwed = items.filter(i => i.active).reduce((s, i) => {
    const overrideMap: Record<string, number> = {};
    i.overrides.forEach(o => { overrideMap[o.userId] = o.amount; });
    return s + users.reduce((us, u) => us + (overrideMap[u.id] ?? i.amount), 0);
  }, 0);
  const totalPaid = items.filter(i => i.active).reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const totalOutstanding = totalOwed - totalPaid;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Dues Tracking</h1>
        </div>
        <button onClick={() => setShowCreateItem(!showCreateItem)}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {showCreateItem ? "Cancel" : "+ New Dues Item"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Total Owed</p>
          <p className="text-3xl font-bold text-white mt-1">${totalOwed.toLocaleString()}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Collected</p>
          <p className="text-3xl font-bold text-green-400 mt-1">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Outstanding</p>
          <p className={`text-3xl font-bold mt-1 ${totalOutstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
            ${totalOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Create form */}
      {showCreateItem && (
        <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Camp Dues 2026" className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (per member)</label>
              <input type="number" value={itemForm.amount} onChange={e => setItemForm({ ...itemForm, amount: e.target.value })}
                placeholder="500" className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date (optional)</label>
              <input type="date" value={itemForm.dueDate} onChange={e => setItemForm({ ...itemForm, dueDate: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
              <input type="text" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Covers food, shade, infrastructure..." className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={createItem} className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition-colors">
            Create Dues Item
          </button>
        </div>
      )}

      {/* Payment recording modal */}
      {paymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPaymentForm(null)}>
          <div className="bg-[#0f1035] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Record Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Member</label>
                <select value={paymentForm.userId} onChange={e => setPaymentForm({ ...paymentForm, userId: e.target.value })}
                  className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Select member...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="500" className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Method</label>
                <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500">
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
                <input type="text" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder="Partial payment, will send rest next week..." className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={recordPayment} className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition-colors">
                Record Payment
              </button>
              <button onClick={() => setPaymentForm(null)} className="text-slate-500 hover:text-slate-300 px-3 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOverrideForm(null)}>
          <div className="bg-[#0f1035] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Adjust Dues</h3>
            <p className="text-xs text-slate-500 mb-4">{users.find(u => u.id === overrideForm.userId)?.name || "Member"}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount for this member</label>
                <input type="number" value={overrideForm.amount} onChange={e => setOverrideForm({ ...overrideForm, amount: e.target.value })}
                  className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason (optional)</label>
                <input type="text" value={overrideForm.reason} onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="early bird, scholarship, organizer discount..." className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={saveOverride} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition-colors">
                Save Adjustment
              </button>
              <button onClick={() => setOverrideForm(null)} className="text-slate-500 hover:text-slate-300 px-3 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Dues items */}
      <div className="space-y-6">
        {items.map(item => {
          const members = memberStatus(item);
          const collected = item.payments.reduce((s, p) => s + p.amount, 0);
          const totalItemOwed = members.reduce((s, m) => s + m.owed, 0);
          const pctCollected = totalItemOwed > 0 ? (collected / totalItemOwed) * 100 : 0;
          const paidCount = members.filter(m => m.balance <= 0).length;

          return (
            <div key={item.id} className={`bg-[#161849]/60 rounded-xl border transition-all ${item.active ? "border-white/5" : "border-white/5 opacity-50"}`}>
              {/* Item header */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-lg">{item.name}</h3>
                    <span className="text-sm text-green-400 font-mono">${item.amount}</span>
                    <span className="text-xs text-slate-500">per member</span>
                    {item.dueDate && (
                      <span className="text-xs text-amber-400/70">Due {new Date(item.dueDate).toLocaleDateString()}</span>
                    )}
                    {!item.active && <span className="text-xs text-slate-600">Archived</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPaymentForm({ duesItemId: item.id, userId: "", amount: String(item.amount), method: "venmo", note: "" })}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40">
                      + Payment
                    </button>
                    <button onClick={() => toggleItem(item)}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-600/20 text-slate-400 hover:bg-slate-600/40">
                      {item.active ? "Archive" : "Reactivate"}
                    </button>
                  </div>
                </div>
                {item.description && <p className="text-xs text-slate-500 mb-2">{item.description}</p>}

                {/* Collection progress */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(pctCollected, 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    ${collected.toLocaleString()} / ${totalItemOwed.toLocaleString()}
                    <span className="text-slate-600 ml-1">({paidCount}/{users.length} paid)</span>
                  </span>
                </div>
              </div>

              {/* Member grid */}
              <div className="px-5 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {members.map(m => (
                    <div key={m.user.id} className={`rounded-lg px-3 py-2 text-xs border ${
                      m.balance <= 0
                        ? "bg-green-500/5 border-green-500/20"
                        : m.paid > 0
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-white/[0.02] border-white/5"
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-medium truncate ${m.balance <= 0 ? "text-green-400" : "text-white"}`}>
                          {m.user.name || m.user.email}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {m.balance <= 0 ? (
                            <span className="text-green-400 text-[10px]">✓ Paid</span>
                          ) : (
                            <span className="text-amber-400 text-[10px]">${m.balance}</span>
                          )}
                          <button
                            onClick={() => setOverrideForm({ duesItemId: item.id, userId: m.user.id, amount: String(m.owed), reason: m.override?.reason || "" })}
                            className="text-slate-600 hover:text-indigo-400 text-[10px] transition-colors" title="Adjust dues">
                            ✎
                          </button>
                        </div>
                      </div>
                      {m.override && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-indigo-400/70 text-[10px]">${m.override.amount} {m.override.reason ? `(${m.override.reason})` : "(adjusted)"}</span>
                          <button onClick={() => removeOverride(m.user.id, item.id)} className="text-slate-700 hover:text-red-400 text-[10px]" title="Reset to default">✕</button>
                        </div>
                      )}
                      {m.payments.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {m.payments.map(p => (
                            <div key={p.id} className="flex justify-between text-[10px] text-slate-500 group">
                              <span>${p.amount} via {p.method} · {new Date(p.paidAt).toLocaleDateString()}</span>
                              <button onClick={() => deletePayment(p.id)} className="text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 transition-all">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
            <p className="text-slate-500">No dues items yet. Create one to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
