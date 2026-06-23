import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // MergeIT palette — derived from #0A2947 (deep navy) and #F3E4C9 (cream).
        navy: {
          DEFAULT: "#0A2947",   // app background
          50:  "#0A2947",
          100: "#0E3055",       // raised card surface
          200: "#123D69",       // hover/inset
          300: "#1B4A7E",       // interactive hover
          400: "#1F4D80",       // default border
          500: "#2A5E99",       // emphasis border
          600: "#8B9CB5"        // muted text
        },
        cream:    "#F3E4C9",    // body text on dark
        sage:     "#D3D4C0",    // titles/labels
        emerald: {
          400: "#5BD0A0",       // primary accent
          500: "#3FBE8E",
          600: "#2EA478"
        },
        accent: {
          50:  "rgba(91, 208, 160, 0.10)",
          100: "rgba(91, 208, 160, 0.18)",
          500: "#5BD0A0",
          600: "#3FBE8E",
          700: "#2EA478"
        },
        severity: {
          critical: { DEFAULT: "#FF5C75", soft: "rgba(255, 92, 117, 0.16)",  border: "rgba(255, 92, 117, 0.35)" },
          high:     { DEFAULT: "#FF9A4D", soft: "rgba(255, 154, 77, 0.16)",  border: "rgba(255, 154, 77, 0.35)" },
          medium:   { DEFAULT: "#F5C04A", soft: "rgba(245, 192, 74, 0.18)",  border: "rgba(245, 192, 74, 0.40)" },
          low:      { DEFAULT: "#5BD0A0", soft: "rgba(91, 208, 160, 0.16)",  border: "rgba(91, 208, 160, 0.40)" },
          info:     { DEFAULT: "#7AB6FF", soft: "rgba(122, 182, 255, 0.16)", border: "rgba(122, 182, 255, 0.35)" }
        }
      },
      fontFamily: {
        sans:    ["var(--font-oswald)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",   "ui-monospace", "monospace"],
        display: ["var(--font-oswald)", "system-ui", "sans-serif"],
        oswald:  ["var(--font-oswald)", "system-ui", "sans-serif"]
      },
      fontSize: {
        xs:   ["12px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        md:   ["15px", { lineHeight: "22px" }],
        lg:   ["16px", { lineHeight: "24px" }],
        xl:   ["20px", { lineHeight: "28px" }],
        "2xl":["24px", { lineHeight: "32px" }],
        "3xl":["30px", { lineHeight: "36px" }],
        "title-md": ["26px", { lineHeight: "32px" }]
      },
      borderRadius: { sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px" },
      boxShadow: {
        card:   "0 1px 2px rgb(0 0 0 / 0.18), 0 1px 3px rgb(0 0 0 / 0.22)",
        pop:    "0 4px 12px rgb(0 0 0 / 0.30), 0 2px 4px rgb(0 0 0 / 0.18)",
        drawer: "0 24px 48px -12px rgb(0 0 0 / 0.45)"
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
