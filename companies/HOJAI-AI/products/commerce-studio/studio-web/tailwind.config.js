/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#6366f1',
        'accent-hover': '#4f46e5',
      },
    },
  },
  plugins: [],
};