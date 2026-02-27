/**
 * Providers.tsx — NextAuth session provider wrapper
 * 
 * Wraps the application with NextAuth SessionProvider for authentication context.
 */

"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
