import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import "../styles/globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-oswald",
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "MergeIT Client Portal", template: "%s · MergeIT Client Portal" },
  description: "Per-tenant Wazuh dashboard for MergeIT customers."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A2947"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${oswald.variable} bg-navy text-cream antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium bg-emerald-400 text-[#0A2947]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
