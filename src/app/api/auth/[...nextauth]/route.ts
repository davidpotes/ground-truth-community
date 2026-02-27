/**
 * /api/auth/[...nextauth] — NextAuth.js authentication endpoints
 * 
 * GET/POST — Handles OAuth flows, login, logout, and session management
 * 
 * Supports Google OAuth and invite code authentication.
 * All NextAuth.js endpoints are automatically handled by this catch-all route.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
