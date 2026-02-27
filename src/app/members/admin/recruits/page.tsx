/**
 * members/admin/recruits/page.tsx — Recruitment pipeline management
 * 
 * Admin interface for managing potential members through recruitment stages.
 * Features assignee color coding, stage progression, confidence tracking,
 * and detailed intake form review with contact management.
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ASSIGNEE_COLORS = [
  "border-l-cyan-400",
  "border-l-amber-400",
  "border-l-rose-400",
  "border-l-emerald-400",
  "border-l-violet-400",
  "border-l-orange-400",
  "border-l-pink-400",
  "border-l-teal-400",
];

const STAGES = [
  { key: "prospect", label: "Prospect", color: "bg-slate-600" },
  { key: "contacted", label: "Contacted", color: "bg-blue-600" },
  { key: "interested", label: "Interested", color: "bg-purple-600" },
  { key: "committed", label: "Committed", color: "bg-yellow-600" },
  { key: "registered", label: "Registered", color: "bg-green-600" },
  { key: "ready", label: "Ready", color: "bg-emerald-500" },
  { key: "declined", label: "Declined", color: "bg-red-800" },
];

interface Intake {
  namePronouns: string;
  projectDescription: string | null;
  enthusiasm: string | null;
  campScenario: string | null;
  gentleReminder: string | null;
  approachStrangers: number | null;
  theatrical: number | null;
  straightFace: number | null;
  beingApproached: number | null;
  idealBalance: string | null;
  burnExperience: string | null;
  campingSetup: string | null;
  skillsResources: string | null;
  duesQuestions: string | null;
  anythingElse: string | null;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  playaName: string | null;
}

interface Recruit {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  socialHandle: string | null;
  stage: string;
  confidence: number;
  notes: string | null;
  lastContactDate: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  updatedAt: string;
  intake: Intake | null;
}

export default function RecruitPipeline() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", socialHandle: "", confidence: 50, notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recruit>>({});
  const [viewIntake, setViewIntake] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [assigneeColorMap, setAssigneeColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = () => {
    fetch("/api/admin/recruits").then((r) => r.json()).then((d) => setRecruits(d.recruits || []));
  };

  useEffect(() => {
    load();
    fetch("/api/admin/users").then(r => r.json()).then(d => {
      const adminList = (d.users || []).filter((u: any) => u.isAdmin);
      setAdmins(adminList);
      const colorMap: Record<string, string> = {};
      adminList.forEach((a: AdminUser, i: number) => {
        colorMap[a.id] = ASSIGNEE_COLORS[i % ASSIGNEE_COLORS.length];
      });
      setAssigneeColorMap(colorMap);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/recruits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", phone: "", socialHandle: "", confidence: 50, notes: "" });
    setShowForm(false);
    load();
  };

  const moveStage = async (id: string, stage: string) => {
    await fetch("/api/admin/recruits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage, lastContactDate: new Date().toISOString().slice(0, 10) }),
    });
    load();
  };

  const updateNotes = async (id: string, notes: string) => {
    await fetch("/api/admin/recruits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    });
    setEditingId(null);
    load();
  };

  const deleteRecruit = async (id: string) => {
    if (!confirm("Remove this recruit?")) return;
    await fetch(`/api/admin/recruits?id=${id}`, { method: "DELETE" });
    load();
  };

  if (status === "loading") return null;

  // Group by stage
  const byStage = STAGES.map((s) => ({
    ...s,
    recruits: recruits.filter((r) => r.stage === s.key),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Recruit Pipeline</h1>
          <span className="text-slate-500 text-sm">{recruits.length} total</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Prospect
        </button>
      </div>

      {/* Assignee legend */}
      {admins.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          <span className="text-slate-600">Assignees:</span>
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm border-l-2 ${assigneeColorMap[a.id] || "border-l-slate-600"} bg-[#0a0b1e]`} />
              <span className="text-slate-400">{a.name || a.email}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-l-2 border-l-transparent bg-[#0a0b1e]" />
            <span className="text-slate-600">Unassigned</span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name *</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Social Handle</label>
            <input
              type="text"
              value={form.socialHandle}
              onChange={(e) => setForm({ ...form, socialHandle: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="@handle (IG, FB, etc)"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Confidence: {form.confidence}%</label>
            <input
              type="range"
              min={0} max={100} step={10}
              value={form.confidence}
              onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Who's recruiting them, context..."
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition-colors">
              Add Prospect
            </button>
          </div>
        </form>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {byStage.map((stage) => (
          <div key={stage.key} className="min-h-[200px]">
            <div className={`${stage.color} rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-center`}>
              {stage.label} ({stage.recruits.length})
            </div>
            <div className="bg-[#161849]/40 rounded-b-lg border border-white/5 p-2 space-y-2">
              {stage.recruits.map((r) => (
                <div key={r.id} className={`bg-[#0a0b1e]/80 rounded-lg p-3 text-sm border-l-2 ${r.assignedToId && assigneeColorMap[r.assignedToId] ? assigneeColorMap[r.assignedToId] : "border-l-transparent"}`}>
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-500">Name</label>
                      <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Email</label>
                      <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Phone</label>
                      <input type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Social Handle</label>
                      <input type="text" value={editForm.socialHandle || ""} onChange={(e) => setEditForm({ ...editForm, socialHandle: e.target.value })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Confidence: {editForm.confidence}%</label>
                      <input type="range" min={0} max={100} step={10} value={editForm.confidence || 50}
                        onChange={(e) => setEditForm({ ...editForm, confidence: Number(e.target.value) })}
                        className="w-full accent-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Notes</label>
                      <textarea value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs min-h-[40px]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Assigned To</label>
                      <select
                        value={editForm.assignedToId || ""}
                        onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value || null })}
                        className="w-full bg-[#161849] border border-white/10 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="">Unassigned</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>{a.playaName || a.name || a.email}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await fetch("/api/admin/recruits", { method: "PUT", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: r.id,
                            name: editForm.name,
                            email: editForm.email,
                            phone: editForm.phone,
                            socialHandle: editForm.socialHandle,
                            confidence: editForm.confidence,
                            notes: editForm.notes,
                            assignedToId: editForm.assignedToId || null,
                          }) });
                        setEditingId(null); load();
                      }} className="text-xs px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                  <div className="flex justify-between items-start">
                    <p className="font-medium truncate">{r.name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      r.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                      r.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{r.confidence}%</span>
                  </div>
                  {r.socialHandle && <p className="text-indigo-400 text-xs truncate">{r.socialHandle}</p>}
                  {r.email && <p className="text-slate-500 text-xs truncate">{r.email}</p>}
                  {r.notes && (
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{r.notes}</p>
                  )}
                  {r.assignedTo && (
                    <p className="text-amber-400/80 text-[10px] mt-1">→ {r.assignedTo.name || r.assignedTo.email}</p>
                  )}
                  {r.lastContactDate && (
                    <p className="text-slate-600 text-[10px] mt-1">Last contact: {r.lastContactDate}</p>
                  )}

                  {/* Stage buttons */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {STAGES.filter((s) => s.key !== r.stage && s.key !== "declined").map((s, i) => {
                      const stageIdx = STAGES.findIndex((st) => st.key === r.stage);
                      const targetIdx = STAGES.findIndex((st) => st.key === s.key);
                      // Show next stage + previous stage only
                      if (targetIdx !== stageIdx + 1 && targetIdx !== stageIdx - 1) return null;
                      return (
                        <button
                          key={s.key}
                          onClick={() => moveStage(r.id, s.key)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                        >
                          {targetIdx > stageIdx ? "→" : "←"} {s.label}
                        </button>
                      );
                    })}
                    {r.stage !== "declined" && (
                      <button
                        onClick={() => moveStage(r.id, "declined")}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                      >
                        ✕ Decline
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingId(r.id); setEditForm(r); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                    >
                      ✏️
                    </button>
                    {r.intake && (
                      <button
                        onClick={() => setViewIntake(viewIntake === r.id ? null : r.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400"
                      >
                        📋
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecruit(r.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-600"
                      title="Delete permanently"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Intake modal */}
                  {viewIntake === r.id && r.intake && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setViewIntake(null)}>
                      <div className="bg-[#0f1035] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="text-lg font-bold text-white">{r.name}</h3>
                            <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                              {r.email && <span>{r.email}</span>}
                              {r.socialHandle && <span>{r.socialHandle}</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Intake Survey Responses</p>
                          </div>
                          <button onClick={() => setViewIntake(null)} className="text-slate-500 hover:text-white text-xl px-2">✕</button>
                        </div>

                        <div className="space-y-4">
                          <IntakeSection label="Name / Pronouns" value={r.intake.namePronouns} />
                          <IntakeSection label="Weirdest project you've built or been part of" value={r.intake.projectDescription} />
                          <IntakeSection label="What excites you about our camp?" value={r.intake.enthusiasm} />
                          <IntakeSection label="Campmate forgot something important — what do you do?" value={r.intake.campScenario} />
                          <IntakeSection label="How do you give a gentle reminder?" value={r.intake.gentleReminder} />

                          <div className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Comfort Levels</p>
                            <div className="grid grid-cols-2 gap-3">
                              <ComfortBar label="Approaching strangers" value={r.intake.approachStrangers} />
                              <ComfortBar label="Theatrical performance" value={r.intake.theatrical} />
                              <ComfortBar label="Keeping a straight face" value={r.intake.straightFace} />
                              <ComfortBar label="Being approached" value={r.intake.beingApproached} />
                            </div>
                          </div>

                          <IntakeSection label="Ideal balance of building vs. socializing" value={r.intake.idealBalance} />
                          <IntakeSection label="Burn experience" value={r.intake.burnExperience} />
                          <IntakeSection label="Camping setup" value={r.intake.campingSetup} />
                          <IntakeSection label="Skills & resources" value={r.intake.skillsResources} />
                          <IntakeSection label="Questions about dues" value={r.intake.duesQuestions} />
                          <IntakeSection label="Anything else" value={r.intake.anythingElse} />
                        </div>

                        {r.notes && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-xs text-slate-500 mb-1">Admin Notes</p>
                            <p className="text-sm text-slate-300">{r.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </>
                )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntakeSection({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ComfortBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{v}/5</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(v / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
