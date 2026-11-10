
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: "#FAF8F3",
          beige: "#EDE5D9",
          gold: "#B89B72",
          dark: "#25231F",
          muted: "#817B72",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      boxShadow: {
        luxury: "0 10px 40px rgba(50, 40, 25, 0.07)",
      },
    },
  },
  plugins: [],
};
