/**
 * page.tsx — Landing page and site entry point
 * 
 * Displays camp branding and provides access to member portal and application form.
 */

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight mb-2">
          <span className="text-indigo-400">◆</span> Ground Truth
        </h1>
        <p className="text-xl text-slate-400 mb-6">Camp Management</p>
        <p className="text-slate-500 mb-10 leading-relaxed">
          Manage your camp&apos;s members, assets, layout, and logistics.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/api/auth/signin"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/apply"
            className="border border-slate-600 hover:border-indigo-400 text-slate-300 hover:text-indigo-400 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}
