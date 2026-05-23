import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Expose our brand CSS variables as Tailwind colour tokens
      // so you can write e.g. text-brand, bg-brand, border-brand
      colors: {
        brand:    "var(--br)",
        brand2:   "var(--br2)",
        brandlt:  "var(--blt)",
        surface:  "var(--sf)",
        surface2: "var(--sf2)",
        tx:       "var(--tx)",
        t2:       "var(--t2)",
        t3:       "var(--t3)",
      },
      fontFamily: {
        // Tailwind classes: font-body, font-display
        body:    ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
        display: ["var(--font-syne)", "Syne", "sans-serif"],
      },
      borderRadius: {
        brand:  "var(--r)",   // 14px
        brands: "var(--rs)",  // 9px
      },
      boxShadow: {
        brand:  "var(--sh)",
        brand2: "var(--sh2)",
      },
    },
  },
  plugins: [],
};
export default config;
