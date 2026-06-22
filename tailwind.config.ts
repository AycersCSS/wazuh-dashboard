import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA"
        },
        severity: {
          critical: { DEFAULT: "#E11D48", soft: "#FFF1F2", border: "#FECDD3" },
          high:     { DEFAULT: "#EA580C", soft: "#FFF7ED", border: "#FED7AA" },
          medium:   { DEFAULT: "#D97706", soft: "#FFFBEB", border: "#FDE68A" },
          low:      { DEFAULT: "#059669", soft: "#ECFDF5", border: "#A7F3D0" },
          info:     { DEFAULT: "#0EA5E9", soft: "#F0F9FF", border: "#BAE6FD" }
        }
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"]
      },
      fontSize: {
        xs:   ["12px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        md:   ["15px", { lineHeight: "22px" }],
        lg:   ["16px", { lineHeight: "24px" }],
        xl:   ["20px", { lineHeight: "28px" }],
        "2xl":["24px", { lineHeight: "32px" }],
        "3xl":["30px", { lineHeight: "36px" }]
      },
      borderRadius: { sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px" },
      boxShadow: {
        card:   "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
        pop:    "0 4px 12px rgb(15 23 42 / 0.08), 0 2px 4px rgb(15 23 42 / 0.04)",
        drawer: "0 24px 48px -12px rgb(15 23 42 / 0.18)"
      },
      keyframes: {
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        "slide-in-right": { "0%": { transform: "translateX(16px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } }
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "slide-in-right": "slide-in-right 200ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
