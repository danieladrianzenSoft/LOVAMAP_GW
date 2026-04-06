/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'custom': '0px 2px 6px rgba(0, 0, 0, 0.1)', // Adjust the offset, blur, and color as needed
      },
      colors: {
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        secondary: {
          50:  'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },
        link: {
          50:  'var(--color-link-50)',
          100: 'var(--color-link-100)',
          200: 'var(--color-link-200)',
          300: 'var(--color-link-300)',
          400: 'var(--color-link-400)',
          500: 'var(--color-link-500)',
        },
        error: {
          50:  'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
        },
      },
    },
  },
  plugins: [],
}

