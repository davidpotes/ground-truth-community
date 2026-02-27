"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const CHANNELS = ["facebook", "instagram", "reddit", "friend", "twitter", "email", "flyer", "other"];
const STAGES = ["prospect", "contacted", "interested", "committed", "registered", "ready", "declined"];
const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-slate-500", contacted: "bg-blue-500", interested: "bg-purple-500",
  committed: "bg-yellow-500", registered: "bg-green-500", ready: "bg-emerald-400", declined: "bg-red-700",
};

interface Campaign {
  id: string;
  name: string;
  caseRef: string;
  channel: string;
  launchedAt: string | null;
  notes: string | null;
  active: boolean;
  clicks: number;
  funnel: { total: number; byStage: Record<string, number> };
}

export default function Campaigns() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", caseRef: "CF-", channel: "facebook", notes: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", channel: "", notes: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = () => {
    fetch("/api/admin/campaigns").then(r => r.json()).then(d => setCampaigns(d.campaigns || []));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setError("");
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", caseRef: "CF-", channel: "facebook", notes: "" });
      setShowForm(false);
      load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  };

  const toggleActive = async (c: Campaign) => {
    await fetch("/api/admin/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    load();
  };

  const markLaunched = async (c: Campaign) => {
    await fetch("/api/admin/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, launched: true }),
    });
    load();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch("/api/admin/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editForm.name, channel: editForm.channel, notes: editForm.notes }),
    });
    setEditingId(null);
    load();
  };

  const totalRecruits = campaigns.reduce((s, c) => s + c.funnel.total, 0);
  const activeCampaigns = campaigns.filter(c => c.active).length;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <span className="text-slate-500 text-sm">{activeCampaigns} active</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Campaigns</p>
          <p className="text-3xl font-bold text-white mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Total Recruits</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{totalRecruits}</p>
        </div>
        <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Conversion</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">
            {totalRecruits > 0
              ? campaigns.reduce((s, c) => s + (c.funnel.byStage["committed"] || 0) + (c.funnel.byStage["registered"] || 0) + (c.funnel.byStage["ready"] || 0), 0)
              : 0}
            <span className="text-lg text-slate-500 ml-1">committed+</span>
          </p>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Campaign Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Facebook Feb 2026"
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Case Ref</label>
              <input
                type="text"
                value={form.caseRef}
                onChange={e => setForm({ ...form, caseRef: e.target.value.toUpperCase() })}
                placeholder="CF-221"
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={e => setForm({ ...form, channel: e.target.value })}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Targeting builder types..."
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex items-center gap-3">
            <button onClick={handleCreate} className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition-colors">
              Create Campaign
            </button>
            <p className="text-slate-500 text-xs">
              Link: yourcamp.example.com/apply?ref={form.caseRef || "CF-???"}
            </p>
          </div>
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-4">
        {campaigns.map(c => (
          <div key={c.id} className={`bg-[#161849]/60 rounded-xl p-5 border transition-all ${c.active ? "border-white/5" : "border-white/5 opacity-50"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white">{c.name}</h3>
                <span className="font-mono text-xs text-indigo-400 bg-indigo-600/20 px-2 py-0.5 rounded">{c.caseRef}</span>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{c.channel}</span>
                {c.launchedAt && <span className="text-xs text-green-400">🟢 Live</span>}
                {!c.launchedAt && c.active && <span className="text-xs text-yellow-400">⏳ Draft</span>}
                {!c.active && <span className="text-xs text-slate-600">Archived</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingId(editingId === c.id ? null : c.id); setEditForm({ name: c.name, channel: c.channel, notes: c.notes || "" }); }} className="text-xs px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40">
                  {editingId === c.id ? "Cancel" : "Edit"}
                </button>
                {!c.launchedAt && c.active && (
                  <button onClick={() => markLaunched(c)} className="text-xs px-3 py-1 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40">
                    Launch
                  </button>
                )}
                <button onClick={() => toggleActive(c)} className="text-xs px-3 py-1 rounded-lg bg-slate-600/20 text-slate-400 hover:bg-slate-600/40">
                  {c.active ? "Archive" : "Reactivate"}
                </button>
              </div>
            </div>

            {editingId === c.id ? (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="Name" />
                <select value={editForm.channel} onChange={e => setEditForm({ ...editForm, channel: e.target.value })}
                  className="bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
                  {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    className="flex-1 bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="Notes" />
                  <button onClick={saveEdit} className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium">Save</button>
                </div>
              </div>
            ) : (
              c.notes && <p className="text-slate-500 text-xs mb-3">{c.notes}</p>
            )}

            {/* Funnel visualization */}
            <div className="flex items-center gap-1">
              {c.clicks === 0 && c.funnel.total === 0 ? (
                <p className="text-slate-600 text-xs">No activity yet</p>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <div className="h-6 rounded flex items-center justify-center px-2 text-[10px] font-bold text-white bg-slate-700">
                      {c.clicks} clicks
                    </div>
                    <span className="text-slate-700 text-xs">→</span>
                  </div>
                  {STAGES.filter(s => s !== "declined").map(stage => {
                    const count = c.funnel.byStage[stage] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={stage} className="flex items-center gap-1">
                        <div className={`h-6 rounded flex items-center justify-center px-2 text-[10px] font-bold text-white ${STAGE_COLORS[stage]}`}>
                          {count} {stage}
                        </div>
                        <span className="text-slate-700 text-xs">→</span>
                      </div>
                    );
                  })}
                  <span className="text-white text-xs font-bold ml-1">{c.funnel.total} total</span>
                  {(c.funnel.byStage["declined"] || 0) > 0 && (
                    <span className="text-red-400/50 text-[10px] ml-2">({c.funnel.byStage["declined"]} declined)</span>
                  )}
                </>
              )}
            </div>

            {/* Link preview */}
            <p className="text-slate-600 text-[10px] mt-2 font-mono">
              yourcamp.example.com/apply?ref={c.caseRef}
            </p>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
            <p className="text-slate-500">No campaigns yet. Create one to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
