/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        stellar: {
          dark: "#0B0E17",
          purple: "#7B61FF",
          blue: "#3E96FF",
        },
      },
    },
  },
  plugins: [],
};
