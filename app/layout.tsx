import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProgressToasts from "./components/progress/ProgressToasts";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "FloraScape - Design Your Dream Garden",
  description:
    "AI-powered garden planning for beautiful, productive, and realistic outdoor spaces.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jersey+15&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ProgressToasts />
      </body>
    </html>
  );
}
