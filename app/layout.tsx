import type { Metadata, Viewport } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { connection } from "next/server";
import { Shell } from "@/components/Shell";
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
  return (
    <html lang="en" className={`${newsreader.variable} ${outfit.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
