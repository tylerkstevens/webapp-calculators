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
        surface: {
          50: '#f5f5f3',   // Warmer, less bright background
          100: '#efeeed',  // Softer off-white
          200: '#e3e2df',  // Warm gray
          300: '#d4d3d0',  // Slightly warm
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
