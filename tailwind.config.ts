import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Existing CSS-variable tokens (keep for backward compat) ───────
      colors: {
        brand:    "var(--br)",
        brand2:   "var(--br2)",
        brandlt:  "var(--blt)",
        surface:  "var(--sf)",
        surface2: "var(--sf2)",
        tx:       "var(--tx)",
        t2:       "var(--t2)",
        t3:       "var(--t3)",
        // ── V2 static tokens ──────────────────────────────────────────
        rp: {
          brand:      '#E85D04',
          brandLight: '#FF9A4D',
          brandBg:    '#FFF3EC',
          brandDark:  '#A03C01',
          50:  '#FFF7ED',
          100: '#FFEDD5',
          500: '#E85D04',
          600: '#C84E03',
          700: '#A03C01',
        },
        portal: {
          customer:     '#E85D04',
          restaurant:   '#065F46',
          restaurantBg: '#ECFDF5',
          creator:      '#7E22CE',
          creatorBg:    '#FDF4FF',
        },
        dark: { DEFAULT: '#141414', 2: '#1E1E1E', 3: '#262626' },
      },
      fontFamily: {
        body:    ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
        display: ["var(--font-syne)", "Syne", "sans-serif"],
        heading: ["var(--font-syne)", "Syne", "sans-serif"],
      },
      borderRadius: {
        brand:  "var(--r)",
        brands: "var(--rs)",
        card:   "14px",
        pill:   "100px",
      },
      boxShadow: {
        brand:     "var(--sh)",
        brand2:    "var(--sh2)",
        card:      "0 2px 12px rgba(0,0,0,0.08)",
        cardHover: "0 8px 30px rgba(0,0,0,0.15)",
        glow:      "0 0 20px rgba(232,93,4,0.25)",
      },
      animation: {
        'float':      'float 4s ease-in-out infinite',
        'fade-up':    'fadeUp 0.4s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s infinite linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
