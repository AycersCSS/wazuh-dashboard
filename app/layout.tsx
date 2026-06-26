import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "../styles/globals.css";
import { MockWorkerBoot } from "@/components/MockWorkerBoot";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";

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

// Pre-hydration script: read the persisted theme and apply the matching class
// to <html> before React mounts, so users with the light theme don't see a
// flash of the dark theme on first paint. Falls back to "dark" to match the
// pre-existing default.
const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem("sentinel-stack:v1:theme");
    var theme = raw ? JSON.parse(raw) : "dark";
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={oswald.variable}>
        <MockWorkerBoot />
        <ToastProvider>
          <TimeRangeProvider>
            {children}
          </TimeRangeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
