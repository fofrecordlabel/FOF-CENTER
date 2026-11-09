import type { Metadata, Viewport } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Shell } from "@/components/Shell";
import { deskAlerts } from "@/lib/alerts";
import { today } from "@/lib/format";
import { query } from "@/lib/pg";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Desk · FOF Records", template: "%s · FOF Records" },
  description: "FOF Records label desk. A&R pipeline, roster, deals, masters, budgets, and royalties.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "FOF", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const locked = (await headers()).get("x-desk-path") === "/lock";
  let alerts: Awaited<ReturnType<typeof deskAlerts>> = [];
  let online = true;
  if (!locked) {
    try {
      await query("SELECT 1");
      alerts = await deskAlerts();
    } catch {
      online = false;
    }
  }
  return (
    <html lang="en" className={`${newsreader.variable} ${outfit.variable}`}>
      <body>
        {locked ? (
          children
        ) : (
          <Shell alerts={alerts} day={today()}>
            {online ? (
              children
            ) : (
              <div className="empty">
                <h1>The desk is offline</h1>
                <p>The database is full. After Supabase Pro is on, the songs and WAV files come back.</p>
              </div>
            )}
          </Shell>
        )}
      </body>
    </html>
  );
}
