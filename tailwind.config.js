/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OpenUni Design System
        background: {
          DEFAULT: '#0F1117',
          secondary: '#161B27',
          tertiary: '#1C2333',
          elevated: '#212840',
        },
        surface: {
          DEFAULT: '#1E2535',
          hover: '#252D42',
          active: '#2C3550',
          border: '#2A3147',
        },
        brand: {
          DEFAULT: '#4F7EF7',
          hover: '#6B93FF',
          muted: '#4F7EF720',
          subtle: '#4F7EF710',
        },
        text: {
          primary: '#E8EDF5',
          secondary: '#8B95B0',
          muted: '#5A6480',
          inverse: '#0F1117',
        },
        accent: {
          green: '#34C785',
          amber: '#F5A623',
          red: '#EF4F5A',
          purple: '#9B6DFF',
        },
        channel: {
          announcement: '#F5A623',
          academic: '#34C785',
          archive: '#9B6DFF',
          social: '#4F7EF7',
          support: '#EF4F5A',
          suggestion: '#00C4B4',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '24px',
      },
      boxShadow: {
        'brand': '0 0 0 1px rgba(79, 126, 247, 0.3), 0 4px 24px rgba(79, 126, 247, 0.12)',
        'surface': '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
        'elevated': '0 4px 16px rgba(0,0,0,0.5)',
        'glow': '0 0 20px rgba(79, 126, 247, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-brand': 'pulseBrand 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseBrand: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
