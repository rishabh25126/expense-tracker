import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      gray: {
        50: '#f3f8f5', 100: '#e9f0ec', 200: '#d4dfd9', 300: '#b9c8c1',
        400: '#96a8a0', 500: '#71877d', 600: '#52665d', 700: '#314139',
        800: '#202a25', 900: '#151d19', 950: '#0d1410',
      },
      emerald: {
        400: '#63dba1', 500: '#3ecf8e', 600: '#29b978',
      },
    },
  } },
  plugins: [],
};

export default config;
