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
        background: "var(--background)", // Background color variable
        foreground: "var(--foreground)", // Foreground color variable
        purple: "#6A0DAD", // Main theme purple color
        accent: "#8A2BE2", // Accent purple color
        highlight: "#9932CC", // Highlight color (another purple shade)
      },
      textColor: {
        pointsPurple: "var(--points-purple)", // Points specific color (dynamic)
      },
      fontFamily: {
        custom: ["'Orbitron'", 'sans-serif'], // Using Orbitron for futuristic Web3 look
      },
      spacing: {
        '128': '32rem', // Custom spacing (optional)
      },
    },
  },
  safelist: [
    'animate__animated',
    'animate__fadeIn',
    'animate__fadeInUp',
    'animate__fadeInDown',
    'animate__zoomIn',
    'animate__bounce', // Add other animate.css classes as needed
  ],
  plugins: [],
};

export default config;
