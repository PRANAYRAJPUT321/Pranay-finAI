import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa";
import { SpotlightTracker } from "@/components/spotlight";

export const metadata: Metadata = {
  title: { default: "PD FinPrep — Finance certification preparation", template: "%s · PD FinPrep" },
  description:
    "Structured, adaptive preparation for finance, accounting, investment, tax and risk certifications. Original practice questions, study plans, mocks, video explainers and transparent analytics.",
  manifest: "/manifest.webmanifest",
  applicationName: "PD FinPrep",
  appleWebApp: { capable: true, title: "PD FinPrep", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#05060f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Sora:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="theme-dark min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {children}
        <PwaRegister />
        <SpotlightTracker />
      </body>
    </html>
  );
}
