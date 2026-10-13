/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#092348', 50: '#eef2f8', 100: '#d5deec', 700: '#0d2f5e', 800: '#092348', 900: '#061833' },
        electric: { DEFAULT: '#087AD1', 50: '#e8f3fc', 100: '#cfe6f8', 600: '#087AD1', 700: '#0664ab' },
        teal: { DEFAULT: '#12B8A6', 50: '#e7f8f6', 100: '#c8efea', 600: '#12B8A6', 700: '#0e9586' },
        amber: { DEFAULT: '#F1B650', 50: '#fdf6e8', 100: '#fbe9c4', 600: '#F1B650', 700: '#c98d24' },
        surface: '#F5F7FA',
      },
      fontFamily: { sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(9,35,72,0.06), 0 4px 16px rgba(9,35,72,0.06)' },
    },
  },
  plugins: [],
};
