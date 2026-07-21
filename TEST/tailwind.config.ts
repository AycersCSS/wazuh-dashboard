import type { Config } from "tailwindcss";

/**
 * design.md palette mapped onto existing token names so pages keep working
 * without rewriting every class. "navy" = grey surfaces from the design system.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#121212", // --bg
          50: "#121212",
          100: "#1e1e1e", // --bg-1 cards
          200: "#2a2a2a", // --bg-2 active / hover
          300: "#323232",
          400: "#3a3a3a", // --border
          500: "#4a4a4a",
          600: "#9a9a9a", // --muted
        },
        cream: "#F3E4C9", // --text
        sage: "#D3D4C0", // --text2
        emerald: {
          400: "#5BD0A0", // --accent
          500: "#3FBE8E",
          600: "#2EA478",
        },
        accent: {
          50: "rgba(91, 208, 160, 0.10)",
          100: "rgba(91, 208, 160, 0.18)",
          500: "#5BD0A0",
          600: "#3FBE8E",
          700: "#2EA478",
        },
        severity: {
          critical: { DEFAULT: "#FF5C75", soft: "rgba(255, 92, 117, 0.16)", border: "rgba(255, 92, 117, 0.35)" },
          high: { DEFAULT: "#FF9A4D", soft: "rgba(255, 154, 77, 0.16)", border: "rgba(255, 154, 77, 0.35)" },
          medium: { DEFAULT: "#F5C04A", soft: "rgba(245, 192, 74, 0.18)", border: "rgba(245, 192, 74, 0.40)" },
          low: { DEFAULT: "#5BD0A0", soft: "rgba(91, 208, 160, 0.16)", border: "rgba(91, 208, 160, 0.40)" },
          info: { DEFAULT: "#7AB6FF", soft: "rgba(122, 182, 255, 0.16)", border: "rgba(122, 182, 255, 0.35)" },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "Arial", "Helvetica", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Consolas", "Courier New", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "Segoe UI", "system-ui", "sans-serif"],
        oswald: ["var(--font-sans)", "Segoe UI", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        md: ["15px", { lineHeight: "22px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "title-md": ["26px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
      },
      borderRadius: { sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px" },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.25), 0 1px 3px rgb(0 0 0 / 0.30)",
        pop: "0 4px 12px rgb(0 0 0 / 0.40), 0 2px 4px rgb(0 0 0 / 0.25)",
        drawer: "0 24px 48px -12px rgb(0 0 0 / 0.55)",
      },
      keyframes: {
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        "slide-in-right": {
          "0%": { transform: "translateX(16px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "slide-in-right": "slide-in-right 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
