import type { Metadata } from "next";
import "../styles/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";

export const metadata: Metadata = {
  title: { default: "Sentinel Stack — Wazuh Dashboard", template: "%s · Sentinel Stack" },
  description: "A clean, custom Wazuh dashboard for security operations teams.",
  icons: { icon: "/favicon.svg" }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06080C"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium bg-indigo-600 text-white">Skip to main content</a>
        <ToastProvider>
          <TimeRangeProvider>
            <div className="flex min-h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 min-w-0 flex flex-col">
                <Topbar />
                <main id="main" className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">
                  {children}
                </main>
              </div>
            </div>
            <CommandPalette />
          </TimeRangeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
