const withMT = require('@material-tailwind/react/utils/withMT')
const colors = require('tailwindcss/colors')

module.exports = withMT({
  content: [
    './components/**/*.js',
    './pages/**/*.js',
    './styles/globals.css',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...colors,
        dark: '#000000',
        light: '#fdfdfd',
        black: '#000000',
        white: '#ffffff',
        slate: {
          ...colors.slate,
          900: '#151515',
          800: '#252525',
          700: '#353535',
          600: '#454545',
          500: '#555555',
          400: '#b5b5b5',
          300: '#c5c5c5',
          200: '#d5d5d5',
          100: '#e5e5e5',
          50: '#f5f5f5',
        },
      },
      screens: {
        '2.5xl': '1920px',
        '3xl': '3000px',
      },
    },
  },
})