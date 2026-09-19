import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0F172A',
          800: '#1F2937',
          600: '#4B5563',
          400: '#9CA3AF',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        shell: {
          900: '#0B1220',
          800: '#111C33',
          700: '#1B2A47',
        },
        line: '#E5E7EB',
        canvas: '#F4F7FB',
      },
      boxShadow: {
        sheet: '0 1px 2px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.08)',
        panel: '0 1px 2px rgba(15,23,42,0.04)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
