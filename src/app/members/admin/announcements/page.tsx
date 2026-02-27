"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const EMOJIS = ["🔥", "📢", "⚡", "🎪", "🏜️", "🛠️", "🎉", "⚠️", "💀", "🧠", "✨", "🚐"];

const COLORS: { key: string; label: string; bg: string; border: string; text: string }[] = [
  { key: "indigo", label: "Indigo", bg: "bg-indigo-600/15", border: "border-indigo-500/30", text: "text-indigo-300" },
  { key: "amber", label: "Amber", bg: "bg-amber-600/15", border: "border-amber-500/30", text: "text-amber-300" },
  { key: "green", label: "Green", bg: "bg-green-600/15", border: "border-green-500/30", text: "text-green-300" },
  { key: "red", label: "Red", bg: "bg-red-600/15", border: "border-red-500/30", text: "text-red-300" },
  { key: "purple", label: "Purple", bg: "bg-purple-600/15", border: "border-purple-500/30", text: "text-purple-300" },
  { key: "pink", label: "Pink", bg: "bg-pink-600/15", border: "border-pink-500/30", text: "text-pink-300" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-600/15", border: "border-cyan-500/30", text: "text-cyan-300" },
];

function getColorStyle(key: string) {
  return COLORS.find(c => c.key === key) || COLORS[0];
}

interface Announcement {
  id: string;
  message: string;
  emoji: string | null;
  color: string;
  expiresAt: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string; member: { playaName: string | null } | null };
}

export default function Announcements() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("📢");
  const [color, setColor] = useState("indigo");
  const [expiresInDays, setExpiresInDays] = useState(7);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
  }, [status, router]);

  const load = () => {
    fetch("/api/announcements").then(r => r.json()).then(d => setAnnouncements(d.announcements || []));
  };

  useEffect(() => { load(); }, []);

  const handlePost = async () => {
    if (!message.trim()) return;
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), emoji, color, expiresInDays }),
    });
    setMessage("");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    load();
  };

  const userId = (session?.user as any)?.userId;
  const isAdmin = (session?.user as any)?.isAdmin;

  function daysLeft(expiresAt: string) {
    const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (d <= 0) return "Expiring";
    if (d === 1) return "1 day left";
    return `${d} days left`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Announcements</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ Post"}
        </button>
      </div>

      {/* Compose form */}
      {showForm && (
        <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 space-y-4">
          {/* Emoji picker */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    emoji === e ? "bg-white/10 ring-2 ring-indigo-500 scale-110" : "hover:bg-white/5"
                  }`}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-400">Message</label>
              <span className={`text-xs ${message.length > 140 ? "text-red-400" : "text-slate-600"}`}>
                {message.length}/140
              </span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 140))}
              placeholder="Keep it short and punchy..."
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none h-20"
              maxLength={140}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  className={`w-8 h-8 rounded-full ${c.bg} border-2 transition-all ${
                    color === c.key ? `${c.border} scale-110` : "border-transparent"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Expires in</label>
            <div className="flex gap-2">
              {[1, 3, 7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setExpiresInDays(d)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    expiresInDays === d ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >{d === 1 ? "24h" : `${d}d`}</button>
              ))}
            </div>
          </div>

          {/* Preview + Post */}
          {message.trim() && (
            <div className={`rounded-lg p-3 border ${getColorStyle(color).bg} ${getColorStyle(color).border}`}>
              <p className={`text-sm ${getColorStyle(color).text}`}>
                {emoji && <span className="mr-2">{emoji}</span>}
                {message}
              </p>
              <p className="text-slate-600 text-[10px] mt-1">Preview</p>
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={!message.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Post Announcement
          </button>
        </div>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.length === 0 && (
          <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
            <p className="text-slate-500">No announcements. Post one to get the word out.</p>
          </div>
        )}
        {announcements.map(a => {
          const cs = getColorStyle(a.color);
          const authorName = a.author.member?.playaName || a.author.name || a.author.email;
          const canDelete = a.author.id === userId || isAdmin;
          return (
            <div key={a.id} className={`rounded-xl p-4 border ${cs.bg} ${cs.border} relative group`}>
              <p className={`text-sm ${cs.text}`}>
                {a.emoji && <span className="mr-2 text-lg">{a.emoji}</span>}
                {a.message}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-slate-600 text-[10px]">
                  {authorName} · {daysLeft(a.expiresAt)}
                </p>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-slate-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
