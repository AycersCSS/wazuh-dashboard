import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "../styles/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";
import { MockWorkerBoot } from "@/components/MockWorkerBoot";
import { AuthGate } from "@/components/AuthGate";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-oswald",
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "MergeIT SOC", template: "%s · MergeIT SOC" },
  description: "MergeIT SOC — managed security operations for Microsoft 365, NinjaOne, Bitdefender, Cyber Essentials, and the customer portal."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A2947"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={oswald.variable}>
        <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium bg-emerald-400 text-[#0A2947]">Skip to main content</a>
        <MockWorkerBoot />
        <ToastProvider>
          <TimeRangeProvider>
            <AuthGate>
              <div className="flex min-h-screen bg-navy text-cream">
                <Sidebar />
                <div className="flex-1 min-w-0 flex flex-col">
                  <Topbar />
                  <main id="main" className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">
                    {children}
                  </main>
                </div>
              </div>
              <CommandPalette />
            </AuthGate>
          </TimeRangeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
