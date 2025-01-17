import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,css}',
    './components/**/*.{js,ts,jsx,tsx,css}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx,css}',
    './prisma/**/*.{js,ts,jsx,tsx}',
    './*.{js,ts,jsx,tsx,css}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        purple: "#6A0DAD",
        accent: "#8A2BE2",
        highlight: "#9932CC",
      },
      textColor: {
        pointsPurple: "var(--points-purple)",
      },
      fontFamily: {
        custom: ["'Orbitron'", 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' }
        }
      },
      animation: {
        scroll: 'scroll 20s linear infinite'
      }
    },
  },
  safelist: [
    'animate__animated',
    'animate__fadeIn',
    'animate__fadeInUp',
    'animate__fadeInDown',
    'animate__zoomIn',
    'animate__bounce',
  ],
  plugins: [],
};

export default config;