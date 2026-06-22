/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
  safelist: [
    'bg-blue-100', 'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-purple-100',
    'text-blue-600', 'text-green-600', 'text-red-600', 'text-gray-600', 'text-purple-600',
    'border-blue-500', 'border-green-500', 'border-red-500'
  ]
};
