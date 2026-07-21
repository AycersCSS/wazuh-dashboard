import type { Metadata } from "next";
import "../styles/globals.css";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";

export const metadata: Metadata = {
  title: { default: "MergeIT SOC", template: "%s · MergeIT SOC" },
  description:
    "MergeIT SOC — managed security operations for Microsoft 365, NinjaOne, Bitdefender, Cyber Essentials, and the customer portal.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121212",
};

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
      <body className="font-sans antialiased">
        <ToastProvider>
          <TimeRangeProvider>{children}</TimeRangeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
