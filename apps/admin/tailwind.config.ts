import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1730',
          primary: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
        neutral: {
          50: '#F4F6FA',
          100: '#E8ECF4',
          200: '#D1D9E8',
          800: '#1E2A3B',
          900: '#0B1730',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.07), 0 1px 2px -1px rgba(0,0,0,.05)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,.1)',
        sidebar: '1px 0 0 0 rgba(0,0,0,.06)',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: { from: { transform: 'translateX(-8px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
