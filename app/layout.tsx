import type { Metadata } from "next";
import { Jersey_15 } from "next/font/google";
import type { ReactNode } from "react";
import ProgressToasts from "./components/progress/ProgressToasts";
import "./globals.css";
import "./theme.css";

// Self-hosted at build time by next/font: no request to Google at runtime, no layout shift.
const jersey = Jersey_15({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-jersey" });

const title = "FloraScape — Collect a garden that fits your space and climate";
const description =
  "Three quick questions turn your beds, ZIP code, and sunlight into an illustrated Collector's Album: a pixel-art garden planted to real spacing, frost-zone planting dates, and a season you can scrub through.";

export const metadata: Metadata = {
  metadataBase: new URL("https://florascaper.vercel.app"),
  title,
  description,
  openGraph: { title, description, url: "/", siteName: "FloraScape", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={jersey.variable}>
      <body>
        {children}
        <ProgressToasts />
      </body>
    </html>
  );
}
