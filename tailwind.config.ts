import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
        },
        border: {
          primary: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          blue: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          red: 'var(--accent-red)',
          purple: 'var(--accent-purple)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'page-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'section-header': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-strong': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'mono': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'mono-sm': ['11px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        'sidebar-collapsed': '64px',
        'sidebar-expanded': '240px',
        'topbar': '56px',
        'breadcrumb': '40px',
        'statusbar': '28px',
        'ai-panel': '400px',
        'ai-panel-wide': '600px',
      },
      animation: {
        'skeleton-shimmer': 'shimmer 1.5s linear infinite',
        'slide-in-right': 'slideInRight 250ms ease-in-out',
        'slide-out-right': 'slideOutRight 200ms ease-in',
        'fade-in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
