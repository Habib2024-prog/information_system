import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 12px 30px -18px rgb(15 23 42 / 0.22)",
        soft: "0 5px 16px -10px rgb(15 23 42 / 0.18)",
      },
      colors: {
        ink: "#172033",
        muted: "#64748b",
        line: "#e2e8f0",
        canvas: "#f8fafc",
        accent: {
          DEFAULT: "#1d4f91",
          foreground: "#ffffff",
          soft: "#eaf1fa",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
