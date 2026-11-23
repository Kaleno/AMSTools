import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        steel: {
          DEFAULT: "#3A6D94",
          dark: "#2A5270",
          tint: "#E7F0F7",
          border: "#E3EAF1",
        },
        surface: "#F2F5F9",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
