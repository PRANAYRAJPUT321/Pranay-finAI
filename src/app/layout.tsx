import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PD FinPrep — Finance certification preparation", template: "%s · PD FinPrep" },
  description:
    "Structured, adaptive preparation for finance, accounting, investment, tax and risk certifications. Original practice questions, study plans, mocks and transparent analytics.",
};

export const viewport: Viewport = { themeColor: "#0b1f3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-navy-900">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
