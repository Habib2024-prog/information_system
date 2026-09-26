import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 38px -26px rgb(15 23 42 / 0.26)",
        soft: "0 6px 18px -14px rgb(15 23 42 / 0.2)",
      },
      colors: {
        ink: "hsl(var(--text-primary) / <alpha-value>)",
        muted: "hsl(var(--text-secondary) / <alpha-value>)",
        line: "hsl(var(--border) / <alpha-value>)",
        canvas: "hsl(var(--background) / <alpha-value>)",
        glass: "hsl(var(--glass))",
        accent: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
