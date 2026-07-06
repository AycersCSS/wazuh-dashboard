import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "../styles/globals.css";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500"],
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

// Pre-hydration: read the persisted theme from localStorage and apply the
// matching class to <html> so users with the light theme don't see a flash of
// dark on first paint. The stored value is whitelisted to "dark" | "light"
// before being used; anything else falls through to "dark".
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
        <ToastProvider>
          <TimeRangeProvider>
            {children}
          </TimeRangeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
