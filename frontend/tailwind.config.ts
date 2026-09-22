import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0D13',
          card: '#131722',
          surface: '#1A202C',
          border: '#232A3B',
          hover: '#2D3748',
        },
      },
    },
  },
  plugins: [],
};
export default config;
