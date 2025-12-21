/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#dae6f2',
          200: '#b8cfe6',
          300: '#8ab1d5',
          400: '#5a8fc0',
          500: '#4970A5',
          600: '#3d5d8a',
          700: '#344d70',
          800: '#2d415d',
          900: '#29384f',
        },
        secondary: {
          50: '#F5F8FB',
          100: '#EBF1F7',
          200: '#D7E3EF',
          300: '#C3D5E7',
          400: '#AFC7DF',
          500: '#9EA8BE',
          600: '#718EBC',
          700: '#5A7199',
          800: '#435477',
          900: '#2C3755',
        },
        surface: {
          50: '#f5f5f3',
          100: '#efeeed',
          200: '#e3e2df',
          300: '#d4d3d0',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        accent: {
          light: '#9EA8BE',
          medium: '#718EBC',
          dark: '#4970A5',
        },
      },
      fontFamily: {
        sans: ['Futura PT', 'Futura', 'Avenir', 'Helvetica Neue', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      fontWeight: {
        heading: '600',
        subheading: '500',
        body: '300',
      },
    },
  },
  plugins: [],
}
