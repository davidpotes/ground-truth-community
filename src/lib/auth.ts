/**
 * auth.ts — NextAuth configuration with dual authentication flows
 * 
 * Supports two login methods:
 * 1. Google OAuth (for pre-registered users only)
 * 2. Invite code redemption (creates new users)
 * 
 * Features JWT sessions, activity tracking, and auto-member creation
 */

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Google OAuth: conditional based on environment variables
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Allow linking Google accounts to existing email addresses
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
      
    // Invite code authentication: allows new user registration
    CredentialsProvider({
      name: "Invite Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Invite Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        // Validate invite code exists and is unused
        const invite = await prisma.inviteCode.findUnique({
          where: { code: credentials.code },
        });

        if (!invite || invite.usedBy) return null;

        // Find existing user or create new one
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // Auto-create user from email (use username part as display name)
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split("@")[0],
            },
          });
        }

        // Consume the invite code (one-time use)
        await prisma.inviteCode.update({
          where: { code: credentials.code },
          data: { usedBy: user.id },
        });

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth security: only allow pre-registered users
      if (account?.provider === "google" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        // Redirect with error if attempting to use unregistered Google account
        if (!existing) {
          return "/members/signin?error=NotRegistered";
        }
      }
      
      // Activity tracking and member setup
      if (user?.id) {
        try {
          const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { member: true },
          });
          const isFirstLogin = currentUser && currentUser.loginCount === 0;

          // Update login statistics
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
          });
          
          // Log authentication event for audit trail
          await prisma.activityLog.create({
            data: { 
              userId: user.id, 
              action: "login", 
              detail: account?.provider || "credentials" 
            },
          });

          // Auto-create member record for new users (bridges User -> Member)
          if (isFirstLogin && !currentUser?.member) {
            await prisma.member.create({
              data: { userId: user.id },
            });
          }
        } catch (_) { 
          // Don't block successful authentication if tracking fails
        }
      }
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      
      // JWT refresh: always sync with database to pick up role/name changes
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          include: { member: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.isAdmin = dbUser.isAdmin;
          token.memberId = dbUser.member?.id ?? null;
        }
      }
      return token;
    },
    
    async session({ session, token }) {
      // Attach custom fields to session for use in components
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).memberId = token.memberId;
        (session.user as any).userId = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/members/signin",
  },
};
