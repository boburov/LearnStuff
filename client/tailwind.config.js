/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        pixel: ["'Pixelify Sans'", "Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // AI chat: xabar pastdan silliq ko'tariladi.
        "msg-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Avatar atrofidagi nafas oluvchi halo.
        "halo-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.18)" },
        },
        // Aylanuvchi gradient (AI o'ylayotganida).
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        // Konfetti uchadigan zarralar emas - oddiy "pop" tasdiq.
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Noto'g'ri javobda silkinish.
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
        // To'g'ri javobda yorug'lik yuguradi.
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Streaming kursor miltillashi.
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        // Gradient matn rangi siljiydi.
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Landing foni: mayin ko'tarilib-tushish.
        "float-y": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -16px, 0)" },
        },
        // Landing foni: sekin erkin suzish.
        // Pixel uslub: silliq emas, "kadrma-kadr" sakrash.
        "pixel-bob": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "33%": { transform: "translate3d(12px, -16px, 0)" },
          "66%": { transform: "translate3d(-10px, 10px, 0)" },
        },
      },
      animation: {
        "msg-in": "msg-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "halo-pulse": "halo-pulse 2.4s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        pop: "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        shake: "shake 0.4s ease-in-out",
        shimmer: "shimmer 1.2s ease-in-out",
        blink: "blink 1s step-end infinite",
        "gradient-x": "gradient-x 4s ease infinite",
        "float-y": "float-y 7s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        "pixel-bob": "pixel-bob 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite",
      },
      colors: {
        pixel: {
          ink: "#1d1330",
          coin: "#facc15",
          heart: "#ef4444",
          slime: "#22c55e",
          bolt: "#3b82f6",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
    },
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [require("tailwindcss-animate")],
};
