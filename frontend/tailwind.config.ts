import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F7F5",
        surface: "#FFFFFF",
        border: "#E5E5E2",
        "text-primary": "#1A1A18",
        "text-secondary": "#6B6B66",
        "text-muted": "#9B9B96",
        accent: "#2563EB",
        risk: {
          low: "#6B7280",
          medium: "#D97706",
          high: "#EA580C",
          critical: "#DC2626",
        }
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)"],
        mono: ["var(--font-plex-mono)"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "4px",
        full: "4px",
      }
    },
  },
  plugins: [],
};
export default config;
