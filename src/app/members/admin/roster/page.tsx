"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  playaName: string | null;
}

export default function Roster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (user: User) => {
    const action = user.isAdmin ? "demote" : "promote";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name || user.email} ${user.isAdmin ? "from" : "to"} admin?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isAdmin: !user.isAdmin }),
    });
    if (res.ok) load();
    else {
      const data = await res.json();
      alert(data.error || "Failed");
    }
  };

  const currentUserId = (session?.user as any)?.id;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">Roster</h1>
        <span className="text-slate-500 text-sm">{users.length} members</span>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-[#161849]/60 rounded-xl px-5 py-4 border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-colors">
            <Link href={`/members/admin/roster/${u.id}`} className="flex items-center gap-3 flex-1 no-underline">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{u.name || "—"}</span>
                  {u.playaName && (
                    <span className="text-indigo-400 text-sm">aka {u.playaName}</span>
                  )}
                  {u.isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-400 font-medium">ADMIN</span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{u.email}</p>
              </div>
            </Link>
            <div>
              {u.id !== currentUserId && (
                <button
                  onClick={() => toggleAdmin(u)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    u.isAdmin
                      ? "bg-red-600/20 text-red-400 hover:bg-red-600/40"
                      : "bg-green-600/20 text-green-400 hover:bg-green-600/40"
                  }`}
                >
                  {u.isAdmin ? "Demote" : "Promote"}
                </button>
              )}
              {u.id === currentUserId && (
                <span className="text-xs text-slate-600">You</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
