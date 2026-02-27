/**
 * ActivityTracker.tsx — Client-side page view analytics
 * 
 * Tracks authenticated user page views in member portal for analytics.
 * Prevents duplicate tracking for the same page within a session.
 */

"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function ActivityTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lastPath = useRef("");

  useEffect(() => {
    if (!session?.user || !pathname?.startsWith("/members")) return;
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    fetch("/api/members/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "page_view", detail: pathname }),
    }).catch(() => {});
  }, [pathname, session]);

  return null;
}
