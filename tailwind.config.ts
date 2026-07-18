import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/react-tailwindcss-select/dist/index.esm.js"
  ],
  prefix: "",
  theme: {
    extend: {
      colors: {
        primary: "#13F187",
        "primary-dark": "#0FBD6B",
        black: "#000000",
        white: "#FFFFFF",
        separator: "#5F5F5F",
        paragraph: "#F2F2F2",
        border: "#5f5f5f",
        error: "#f44336",
        modal: "#0b4b2f12",
        // Neon-degen design system
        abyss: "#030a06",
        accent: "#00e0a0",
      },
      boxShadow: {
        "neon-sm": "0 0 12px rgba(19,241,135,0.25)",
        neon: "0 0 24px rgba(19,241,135,0.35)",
        "neon-lg": "0 0 64px rgba(19,241,135,0.28)",
        card: "0 12px 48px rgba(0,0,0,0.55)",
      },
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 18px rgba(19,241,135,0.22)" },
          "50%": { boxShadow: "0 0 36px rgba(19,241,135,0.48)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      screens: {
        xs: "450px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
