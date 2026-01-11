/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        foreground: '#f8fafc',
        card: {
          DEFAULT: '#1e293b',
          foreground: '#f8fafc',
        },
        popover: {
          DEFAULT: '#1e293b',
          foreground: '#f8fafc',
        },
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#334155',
          foreground: '#f8fafc',
        },
        muted: {
          DEFAULT: '#334155',
          foreground: '#94a3b8',
        },
        accent: {
          DEFAULT: '#334155',
          foreground: '#f8fafc',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#eab308',
          foreground: '#000000',
        },
        border: '#334155',
        input: '#334155',
        ring: '#3b82f6',
        chart: {
          up: '#10b981',
          down: '#ef4444',
          upperBound: '#f97316',
          lowerBound: '#3b82f6',
          pivotHigh: '#ef4444',
          pivotLow: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
