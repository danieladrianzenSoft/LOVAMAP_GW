/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'custom': '0px 2px 6px rgba(0, 0, 0, 0.1)', // Adjust the offset, blur, and color as needed
      },
    },
  },
  plugins: [],
}

