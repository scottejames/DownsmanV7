/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        scout: {
          purple: '#4d2177',
          'purple-light': '#6b3a9e',
          teal: '#004851',
          'teal-light': '#006670',
        },
      },
    },
  },
  plugins: [],
};
