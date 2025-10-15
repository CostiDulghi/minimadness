/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF4FB6",   // roz neon
        secondary: "#FF7A00", // portocaliu intens
        dark: "#1A0C2F",      // fundal mov închis
      },
    },
  },
  plugins: [],
};
