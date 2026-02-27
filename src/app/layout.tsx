/**
 * layout.tsx — Root application layout and providers
 * 
 * Configures NextAuth, navigation, and activity tracking for all pages.
 * Includes global CSS and provides authentication/session context.
 */

import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { ActivityTracker } from "@/components/ActivityTracker";

export const metadata: Metadata = {
  title: "Ground Truth — Camp Management",
  description: "Open source camp management app for Burning Man theme camps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <div className="starfield" />
          <Nav />
          <ActivityTracker />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
