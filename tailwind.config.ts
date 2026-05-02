import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#07080c",
          900: "#0b0d14",
          800: "#11141d",
          700: "#1a1e2b",
          600: "#262b3d",
          500: "#3a4159",
          400: "#5b6480",
          300: "#8a92ad",
        },
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        flashGood: {
          "0%": { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.0)" },
          "28%": { boxShadow: "0 0 0 11px rgba(74, 222, 128, 0.62)" },
          "100%": { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.0)" },
        },
        flashMid: {
          "0%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0.0)" },
          "30%": { boxShadow: "0 0 0 8px rgba(251, 191, 36, 0.5)" },
          "100%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0.0)" },
        },
        flashBad: {
          "0%": { boxShadow: "0 0 0 0 rgba(248, 113, 113, 0.0)" },
          "30%": { boxShadow: "0 0 0 8px rgba(248, 113, 113, 0.55)" },
          "100%": { boxShadow: "0 0 0 0 rgba(248, 113, 113, 0.0)" },
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.94)" },
          "8%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "70%": { opacity: "1", transform: "translateY(-14px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-44px) scale(0.96)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        flashLine: {
          "0%": { opacity: "0", strokeDashoffset: "1" },
          "12%": { opacity: "1" },
          "35%": { strokeDashoffset: "0" },
          "78%": { opacity: "1", strokeDashoffset: "0" },
          "100%": { opacity: "0", strokeDashoffset: "0" },
        },
        flashLineDot: {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "20%": { opacity: "1", transform: "scale(1.2)" },
          "30%": { transform: "scale(1)" },
          "78%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        hitStopPunch: {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "40%": { transform: "scale(0.985)", filter: "brightness(1.07)" },
          "100%": { transform: "scale(1)", filter: "brightness(1)" },
        },
        correctSlotPop: {
          "0%": { transform: "scale(1)" },
          "18%": { transform: "scale(1.16)" },
          "42%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        celebrationFlash: {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(10px)" },
          "7%": { opacity: "1", transform: "scale(1.06) translateY(0)" },
          "14%": { opacity: "1", transform: "scale(1) translateY(0)" },
          "100%": { opacity: "0", transform: "scale(0.96) translateY(-10px)" },
        },
      },
      animation: {
        pop: "pop 280ms ease-out",
        flashGood: "flashGood 780ms ease-out",
        flashMid: "flashMid 700ms ease-out",
        flashBad: "flashBad 700ms ease-out",
        floatUp: "floatUp 2400ms ease-out forwards",
        shimmer: "shimmer 6s linear infinite",
        flashLine: "flashLine 1700ms ease-out forwards",
        flashLineDot: "flashLineDot 1700ms ease-out forwards",
        hitStop: "hitStopPunch 95ms cubic-bezier(0.34, 1.2, 0.64, 1) both",
        correctSlotPop: "correctSlotPop 560ms cubic-bezier(0.33, 1.35, 0.64, 1) both",
        celebrationFlash: "celebrationFlash 2000ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
