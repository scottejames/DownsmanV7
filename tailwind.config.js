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
          // Dialog panels sit on an elevated surface distinct from the page
          // background (previously both were #004851, so panels had no
          // visual separation from the backdrop besides the overlay).
          surface: '#052b30',
          field: '#0e3a40',
          'field-border': '#1c545c',
        },
      },
    },
  },
  plugins: [],
};
