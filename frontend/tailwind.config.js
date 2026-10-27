export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#351C2C", soft: "#53233D" },
        canvas: "#FCF4F8",
        panel: "#FFFCFE",
        brand: { DEFAULT: "#D74691", dark: "#B72F74", light: "#FCE4F0" },
        mint: "#14856D",
        gold: "#9A6500",
        coral: "#C73F62",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        caret: { "50%": { opacity: "0" } },
        grow: { "0%": { transform: "scale(0)" }, "100%": { transform: "scale(1)" } },
        draw: { "0%": { strokeDashoffset: "1" }, "100%": { strokeDashoffset: "0" } },
        float: { "0%, 100%": { transform: "translateY(0) scale(1)" }, "50%": { transform: "translateY(-5px) scale(1.04)" } },
      },
      animation: {
        pop: "pop .35s cubic-bezier(.2,1.4,.4,1) both",
        caret: "caret 1s steps(1) infinite",
        grow: "grow .9s cubic-bezier(.2,.8,.2,1) both",
        draw: "draw 1.2s ease-out both",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
