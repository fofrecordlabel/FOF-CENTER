import type { Metadata, Viewport } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { connection } from "next/server";
import { headers } from "next/headers";
import Script from "next/script";
import { Shell } from "@/components/Shell";
import { ThemeBoot } from "@/components/ThemeToggle";
import { deskAlerts } from "@/lib/alerts";
import { today } from "@/lib/format";
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
  if (!locked) {
    try {
      alerts = await deskAlerts();
    } catch {
      alerts = [];
    }
  }
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${newsreader.variable} ${outfit.variable}`}>
      <body>
        <ThemeBoot />
        <Script id="fof-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("fof-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#f3f3f1":"#000000");}catch(e){}})();`}
        </Script>
        {locked ? children : <Shell alerts={alerts} day={today()}>{children}</Shell>}
      </body>
    </html>
  );
}
