"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Invite {
  id: string;
  code: string;
  usedBy: string | null;
  createdAt: string;
}

export default function InviteCodes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
    if (status === "authenticated" && !(session?.user as any)?.isAdmin) router.push("/members");
  }, [status, session, router]);

  const load = () => {
    fetch("/api/admin/invites").then((r) => r.json()).then((d) => setInvites(d.invites || []));
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    await fetch("/api/admin/invites", { method: "POST" });
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this invite code?")) return;
    await fetch(`/api/admin/invites?id=${id}`, { method: "DELETE" });
    load();
  };

  if (status === "loading") return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Invite Codes</h1>
        </div>
        <button
          onClick={generate}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Generate Code
        </button>
      </div>

      <div className="space-y-3">
        {invites.map((inv) => (
          <div key={inv.id} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5 flex justify-between items-center">
            <div>
              <p className="font-mono text-lg font-bold tracking-wider">
                {inv.code}
              </p>
              <p className="text-xs text-slate-500">
                Created {new Date(inv.createdAt).toLocaleDateString()}
                {inv.usedBy && <span className="text-green-400 ml-2">✓ Used</span>}
              </p>
            </div>
            <div className="flex gap-3">
              {!inv.usedBy && (
                <button
                  onClick={() => copyCode(inv.code)}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Copy
                </button>
              )}
              <button
                onClick={() => revoke(inv.id)}
                className="text-sm text-red-400/50 hover:text-red-400"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
        {invites.length === 0 && (
          <div className="bg-[#161849]/60 rounded-xl p-6 border border-white/5 text-center">
            <p className="text-slate-500">No invite codes yet. Generate one to invite a member.</p>
          </div>
        )}
      </div>
    </div>
  );
}
