import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Chakravyuh design tokens
        'bg-void':     '#060A14',
        'bg-base':     '#0C1220',
        'bg-surface':  '#111827',
        'bg-elevated': '#182236',
        'bg-overlay':  '#1E2D45',
        'border-dim':  '#1A2640',
        'border-default': '#243450',
        'border-bright':  '#2E4570',
        'text-primary':   '#EDF2FF',
        'text-secondary': '#7A92B8',
        'text-muted':     '#3D5275',
        'text-mono':      '#A8C4E8',
        'brand':          '#2563EB',
        'brand-light':    '#3B82F6',
        'risk-critical':  '#DC2626',
        'risk-high':      '#EA580C',
        'risk-medium':    '#D97706',
        'risk-low':       '#16A34A',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.7)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
        'live-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.3' },
        },
        'scale-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':       { transform: 'scale(1.02)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer:      'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'live-dot':   'live-dot 1.4s ease-in-out infinite',
        'scale-pulse':'scale-pulse 2s ease-in-out infinite',
        'slide-in':   'slide-in 0.4s ease-out forwards',
        ticker:       'ticker 30s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-blue': 'linear-gradient(90deg, #1A2235 0%, #1E3A5F 50%, #1A2235 100%)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
