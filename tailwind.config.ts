import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#F4F7FB",
          100: "#173358",
          200: "#122A4A",
          300: "#0F2541",
          400: "#0C2038",
          500: "#0A1A2E",
          600: "#B8C4D0"
        },
        cream:    "#F3E4C9",
        sage:     "#C9D1D9",
        emerald:  {
          400: "#5BD0A0",
          500: "#3FB58A"
        },
        severity: {
          critical: { DEFAULT: "#F25C5C", soft: "#3A1A1A", border: "#5C2A2A" },
          high:     { DEFAULT: "#F0925C", soft: "#3A2418", border: "#5C3A2A" },
          medium:   { DEFAULT: "#E0B35C", soft: "#3A2E18", border: "#5C4A2A" },
          low:      { DEFAULT: "#5BD0A0", soft: "#16352A", border: "#2A5C4A" },
          info:     { DEFAULT: "#7AA6D6", soft: "#16283A", border: "#2A4A6C" },
          neutral:  { DEFAULT: "#8C9AA8", soft: "#1A2030", border: "#2A3445" }
        }
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "ui-sans-serif", "system-ui"],
        mono:    ["var(--font-mono)",    "ui-monospace",  "SFMono-Regular"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        oswald:  ["var(--font-oswald)",  "ui-sans-serif", "system-ui"]
      },
      borderRadius: {
        card:   "0.625rem",
        pop:    "0.875rem",
        drawer: "0.5rem"
      },
      boxShadow: {
        card:   "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 4px 16px -8px rgba(0,0,0,0.6)",
        pop:    "0 10px 30px -10px rgba(0,0,0,0.7)",
        drawer: "-10px 0 30px -10px rgba(0,0,0,0.7)"
      },
      keyframes: {
        "pulse-soft": {
          "0%,100%": { opacity: "0.8" },
          "50%":     { opacity: "0.4" }
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        }
      },
      animation: {
        "pulse-soft":      "pulse-soft 2.4s ease-in-out infinite",
        "slide-in-right":  "slide-in-right 200ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
